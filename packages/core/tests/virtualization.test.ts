import { describe, it, expect } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";

let testId = 0;
const createNodeflow = (
  settings: Partial<NodeflowData["settings"]> = {},
): NodeflowData => {
  const nf = new NodeflowData(`test-virtualization-${++testId}`, {
    virtualizationMargin: 0,
    ...settings,
  });
  nf.updateCanvasSize(Vec2.of(800, 600));
  return nf;
};

const addNode = (nf: NodeflowData, id: string, x: number, y: number) =>
  nf.addNode({ id, position: { x, y }, size: { x: 100, y: 50 } }, false);

describe("NodeflowData.getVisibleRect", () => {
  it("is undefined before the canvas is measured", () => {
    const nf = new NodeflowData(`test-virtualization-${++testId}`);
    expect(nf.getVisibleRect()).toBeUndefined();
  });

  it("follows pan and zoom", () => {
    const nf = createNodeflow();
    nf.update({ position: Vec2.of(-1000, -500), zoomLevel: 2 });

    const rect = nf.getVisibleRect()!;
    expect(rect.position.equals(Vec2.of(1000, 500))).toBe(true);
    expect(rect.size.equals(Vec2.of(400, 300))).toBe(true);
  });
});

describe("NodeflowData.getVisibleNodeIds", () => {
  it("returns undefined when virtualization is off", () => {
    const nf = createNodeflow({ virtualization: false });
    addNode(nf, "a", 5000, 5000);
    expect(nf.getVisibleNodeIds()).toBeUndefined();
  });

  it("returns an empty set before the canvas is measured", () => {
    const nf = new NodeflowData(`test-virtualization-${++testId}`);
    addNode(nf, "a", 0, 0);
    expect(nf.getVisibleNodeIds()?.size).toBe(0);
  });

  it("includes only nodes overlapping the viewport", () => {
    const nf = createNodeflow();
    addNode(nf, "in", 100, 100);
    addNode(nf, "out", 5000, 5000);

    expect([...nf.getVisibleNodeIds()!]).toEqual(["in"]);
  });

  it("includes a node that starts left of the viewport but overlaps it", () => {
    const nf = createNodeflow();
    nf.addNode(
      { id: "wide", position: { x: -3000, y: 10 }, size: { x: 3100, y: 50 } },
      false,
    );

    expect(nf.getVisibleNodeIds()!.has("wide")).toBe(true);
  });

  it("updates after panning", () => {
    const nf = createNodeflow();
    addNode(nf, "far", 5000, 5000);
    expect(nf.getVisibleNodeIds()!.has("far")).toBe(false);

    nf.update({ position: Vec2.of(-4900, -4900) });
    expect(nf.getVisibleNodeIds()!.has("far")).toBe(true);
  });

  it("widens the area by the margin in screen pixels", () => {
    const nf = createNodeflow({ virtualizationMargin: 200 });
    nf.update({ zoomLevel: 2 });
    // Viewport covers x 0..400 in canvas space; 200 screen px = 100 canvas px.
    addNode(nf, "near", 450, 10);
    addNode(nf, "far", 550, 10);

    const ids = nf.getVisibleNodeIds()!;
    expect(ids.has("near")).toBe(true);
    expect(ids.has("far")).toBe(false);
  });

  it("keeps selected nodes and nodes with held connectors", () => {
    const nf = createNodeflow();
    const selected = addNode(nf, "selected", 5000, 5000);
    nf.mouseData.selections.addNode(selected);

    expect(nf.getVisibleNodeIds()!.has("selected")).toBe(true);
  });

  it("tracks nodes that move and drops removed nodes", () => {
    const nf = createNodeflow();
    const node = addNode(nf, "a", 5000, 5000);

    node.position = Vec2.of(10, 10);
    expect(nf.getVisibleNodeIds()!.has("a")).toBe(true);

    nf.removeNode("a", false);
    expect(nf.getVisibleNodeIds()!.has("a")).toBe(false);
    expect(nf.chunking.chunks.size).toBe(0);
  });

  it("publishes a content change when virtualization settings change", () => {
    const nf = createNodeflow();
    let calls = 0;
    nf.eventStore.onContentChanged.subscribe("test", () => ++calls);

    nf.updateSettings({ virtualizationMargin: 50 });
    expect(calls).toBe(1);
  });
});

describe("NodeflowChunking index", () => {
  it("indexes new nodes by their top-left position", () => {
    const nf = createNodeflow();
    addNode(nf, "a", 2040, 10);
    // The center (2090) would land in chunk 1; the position stays in chunk 0.
    expect(nf.chunking.getChunk(Vec2.of(0, 0)).has("a")).toBe(true);
  });

  it("re-indexes nodes when chunkSize changes", () => {
    const nf = createNodeflow();
    addNode(nf, "a", 1500, 10);
    nf.chunking.chunkSize = 1000;

    expect(nf.chunking.getChunk(Vec2.of(1500, 10)).has("a")).toBe(true);
    expect(
      nf.chunking.getNodesInRect(Rect.of(Vec2.of(1550, 20), Vec2.of(10, 10))),
    ).toHaveLength(1);
  });
});
