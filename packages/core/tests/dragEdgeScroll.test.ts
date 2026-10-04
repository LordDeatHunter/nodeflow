import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";

const CANVAS_SIZE = Vec2.of(800, 600);

const RIGHT_EDGE = Vec2.of(795, 300);
const LEFT_EDGE = Vec2.of(5, 300);
const TOP_EDGE = Vec2.of(400, 5);
const BOTTOM_EDGE = Vec2.of(400, 595);
const CENTER = Vec2.of(400, 300);

function createDraggingCanvas(
  settings: Record<string, unknown> = {},
): { canvas: NodeflowData; node: { position: Vec2 } } {
  const canvas = new NodeflowData("edge-scroll-canvas", settings);
  canvas.updateCanvasSize(CANVAS_SIZE);
  canvas.update({ startPosition: Vec2.zero() });

  const node = canvas.addNode({ id: "n1", position: { x: 0, y: 0 } }, false);
  canvas.mouseData.selectNode("n1", CENTER, true);

  return { canvas, node };
}

describe("node drag edge auto-scroll", () => {
  let canvas: NodeflowData | undefined;

  beforeEach(() => {
    canvas = undefined;
  });

  afterEach(() => {
    canvas?.stopDragEdgeScroll();
    vi.useRealTimers();
  });

  it("defaults dragEdgeScrollSpeed to 1", () => {
    const fresh = new NodeflowData("defaults");
    expect(fresh.settings.dragEdgeScrollSpeed).toBe(1);
  });

  it("does nothing while the pointer is away from the edges", () => {
    const { canvas: c, node } = createDraggingCanvas();
    canvas = c;
    c.mouseData.mousePosition = CENTER;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(0);
    expect(c.position.x).toBe(0);
  });

  it("scrolls toward the right edge, keeping the node glued to the pointer", () => {
    const { canvas: c, node } = createDraggingCanvas();
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(1);
    expect(c.position.x).toBe(-1);
    expect(node.position.x + c.position.x).toBe(0);
  });

  it("scrolls toward the left, top and bottom edges", () => {
    const scenarios = [
      { pointer: LEFT_EDGE, axis: "x", sign: -1 },
      { pointer: TOP_EDGE, axis: "y", sign: -1 },
      { pointer: BOTTOM_EDGE, axis: "y", sign: 1 },
    ] as const;

    scenarios.forEach(({ pointer, axis, sign }) => {
      const { canvas: c, node } = createDraggingCanvas();
      c.mouseData.mousePosition = pointer;

      c.handleDragEdgeScroll();

      expect(node.position[axis]).toBe(sign);
      expect(c.position[axis]).toBe(-sign);
      c.stopDragEdgeScroll();
    });
  });

  it("honors a custom speed", () => {
    const { canvas: c, node } = createDraggingCanvas({
      dragEdgeScrollSpeed: 4,
    });
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(4);
    expect(c.position.x).toBe(-4);
  });

  it("treats negative speeds as 0", () => {
    const { canvas: c, node } = createDraggingCanvas({
      dragEdgeScrollSpeed: -10,
    });
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(0);
    expect(c.position.x).toBe(0);
  });

  it("does not scroll when the speed is 0", () => {
    const { canvas: c, node } = createDraggingCanvas({
      dragEdgeScrollSpeed: 0,
    });
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.updateDragEdgeScroll();

    expect(node.position.x).toBe(0);
    expect(c.dragEdgeScrollIntervalId).toBeUndefined();
  });

  it("does not scroll when no nodes are held", () => {
    const { canvas: c, node } = createDraggingCanvas();
    canvas = c;
    c.mouseData.selections.clear();
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(0);
    expect(c.position.x).toBe(0);
  });

  it("does not scroll before the canvas has been measured", () => {
    const c = new NodeflowData("unmeasured");
    canvas = c;
    const node = c.addNode({ id: "n1", position: { x: 0, y: 0 } }, false);
    c.mouseData.selectNode("n1", RIGHT_EDGE, true);
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.handleDragEdgeScroll();

    expect(node.position.x).toBe(0);
  });

  it("publishes onCanvasTransformChanged while scrolling", () => {
    const { canvas: c } = createDraggingCanvas();
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    const listener = vi.fn();
    c.eventStore.onCanvasTransformChanged.subscribe("test:listener", listener);

    c.handleDragEdgeScroll();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].position).toEqual({ x: -1, y: 0 });
  });

  it("repeats on an interval while held at the edge and stops on release", () => {
    vi.useFakeTimers();
    const { canvas: c, node } = createDraggingCanvas({
      dragEdgeScrollSpeed: 2,
    });
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.updateDragEdgeScroll();
    expect(c.dragEdgeScrollIntervalId).toBeDefined();

    vi.advanceTimersByTime(48);

    expect(node.position.x).toBe(6);
    expect(c.position.x).toBe(-6);

    c.mouseData.pointerDown = false;
    vi.advanceTimersByTime(16);

    const releasedPosition = node.position.x;
    vi.advanceTimersByTime(160);

    expect(c.dragEdgeScrollIntervalId).toBeUndefined();
    expect(node.position.x).toBe(releasedPosition);
  });

  it("stops scrolling when the pointer leaves the edge band", () => {
    vi.useFakeTimers();
    const { canvas: c } = createDraggingCanvas();
    canvas = c;
    c.mouseData.mousePosition = RIGHT_EDGE;

    c.updateDragEdgeScroll();
    expect(c.dragEdgeScrollIntervalId).toBeDefined();

    c.mouseData.mousePosition = CENTER;
    vi.advanceTimersByTime(16);

    expect(c.dragEdgeScrollIntervalId).toBeUndefined();
  });
});
