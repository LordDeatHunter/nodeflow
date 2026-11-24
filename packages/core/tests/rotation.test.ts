import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

describe("node rotation", () => {
  let canvas: NodeflowData;

  beforeEach(() => {
    canvas = new NodeflowData("rotation-canvas");
  });

  it("starts at 0", () => {
    const node = canvas.addNode({ id: "n" }, false);
    expect(node.rotation).toBe(0);
  });

  it("steps clockwise in quarter turns and wraps", () => {
    const node = canvas.addNode({ id: "n" }, false);
    expect(node.rotatedBy(1)).toBe(90);
    node.rotation = 270;
    expect(node.rotatedBy(1)).toBe(0);
    expect(node.rotatedBy(-1)).toBe(180);
    expect(node.rotatedBy(6)).toBe(90);
  });

  it("survives serialize/deserialize (templates, composites, undo)", () => {
    const node = canvas.addNode({ id: "n", rotation: 180 }, false);
    expect(node.rotation).toBe(180);
    expect(node.serialize().rotation).toBe(180);

    const copy = new NodeflowData("copy");
    copy.deserialize(canvas.serialize());
    expect(copy.nodes.get("n")?.rotation).toBe(180);
  });

  it("is undoable through updateNode, with a position change", () => {
    const node = canvas.addNode(
      { id: "n", position: { x: 48, y: 48 } },
      false,
    );
    canvas.updateNode("n", { rotation: 90, position: Vec2.of(72, 24) });
    expect(node.rotation).toBe(90);
    expect(node.position.equals(Vec2.of(72, 24))).toBe(true);

    canvas.changes.undo();
    const restored = canvas.nodes.get("n")!;
    expect(restored.rotation).toBe(0);
    expect(restored.position.equals(Vec2.of(48, 48))).toBe(true);

    canvas.changes.redo();
    expect(canvas.nodes.get("n")!.rotation).toBe(90);
  });
});
