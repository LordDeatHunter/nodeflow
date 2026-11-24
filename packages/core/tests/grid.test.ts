/**
 * Tests for grid snapping: `gridSize`, `snapNodePositionToGrid` and
 * `snapNodeSizeToGrid`.
 */
import { describe, it, expect } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";
import { NodeflowSettings } from "../src/nodeflow-types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

const CENTER = Vec2.of(400, 300);

function createCanvas(settings: Partial<NodeflowSettings> = {}): NodeflowData {
  const canvas = new NodeflowData("grid-canvas", {
    allowCollision: true,
    gridSize: 20,
    snapNodePositionToGrid: true,
    ...settings,
  });
  canvas.updateCanvasSize(Vec2.of(800, 600));
  canvas.update({ startPosition: Vec2.zero() });
  return canvas;
}

describe("grid snapping", () => {
  describe("defaults", () => {
    it("is off by default", () => {
      expect(NodeflowData.DEFAULT_SETTINGS.snapNodePositionToGrid).toBe(false);
      expect(NodeflowData.DEFAULT_SETTINGS.snapNodeSizeToGrid).toBe(false);
      expect(NodeflowData.DEFAULT_SETTINGS.gridSize).toBe(20);
    });

    it("leaves positions untouched when position snapping is off", () => {
      const canvas = createCanvas({ snapNodePositionToGrid: false });
      const node = canvas.addNode({ id: "n", position: { x: 13, y: 7 } }, false);
      expect(node.position).toEqual(Vec2.of(13, 7));

      node.position = Vec2.of(31, 49);
      expect(node.position).toEqual(Vec2.of(31, 49));
    });
  });

  describe("node position", () => {
    it("snaps the initial position", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n", position: { x: 13, y: 7 } }, false);
      expect(node.position).toEqual(Vec2.of(20, 0));
    });

    it("snaps through the setter and update()", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n" }, false);

      node.position = Vec2.of(29, -31);
      expect(node.position).toEqual(Vec2.of(20, -40));

      node.update({ position: Vec2.of(51, 69) });
      expect(node.position).toEqual(Vec2.of(60, 60));
    });

    it("ignores an invalid grid size", () => {
      const canvas = createCanvas({ gridSize: 0 });
      const node = canvas.addNode({ id: "n", position: { x: 13, y: 7 } }, false);
      expect(node.position).toEqual(Vec2.of(13, 7));
    });

    it("lets the node boundary win over the grid", () => {
      const canvas = createCanvas({
        nodeBoundary: Rect.of(Vec2.of(5, 5), Vec2.of(100, 100)),
      });
      const node = canvas.addNode({ id: "n", position: { x: 0, y: 0 } }, false);
      expect(node.position).toEqual(Vec2.of(5, 5));
    });
  });

  describe("dragging", () => {
    it("accumulates small deltas instead of rounding them away", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n", position: { x: 0, y: 0 } }, false);
      canvas.mouseData.selectNode("n", CENTER, true);

      for (let i = 0; i < 9; i++) canvas.updateHeldNodePosition(Vec2.of(1, 0));
      expect(node.position.x).toBe(0);

      canvas.updateHeldNodePosition(Vec2.of(1, 0));
      expect(node.position.x).toBe(20);

      for (let i = 0; i < 20; i++) canvas.updateHeldNodePosition(Vec2.of(1, 0));
      expect(node.position.x).toBe(40);
    });

    it("re-seeds from the node when something else moves it mid-drag", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n", position: { x: 0, y: 0 } }, false);
      canvas.mouseData.selectNode("n", CENTER, true);

      canvas.updateHeldNodePosition(Vec2.of(8, 0));
      node.position = Vec2.of(200, 0);
      canvas.updateHeldNodePosition(Vec2.of(8, 0));

      expect(node.position.x).toBe(200);
      canvas.updateHeldNodePosition(Vec2.of(4, 0));
      expect(node.position.x).toBe(220);
    });

    it("forgets the accumulated offset when the drag state is cleared", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n", position: { x: 0, y: 0 } }, false);
      canvas.mouseData.selectNode("n", CENTER, true);

      canvas.updateHeldNodePosition(Vec2.of(9, 0));
      canvas.clearDragState();
      canvas.updateHeldNodePosition(Vec2.of(9, 0));

      expect(node.position.x).toBe(0);
    });

    it("limits a group against the boundary using unsnapped positions", () => {
      const canvas = createCanvas({
        nodeBoundary: Rect.of(Vec2.of(0, 0), Vec2.of(100, 100)),
      });
      const node = canvas.addNode({ id: "n", position: { x: 0, y: 0 } }, false);
      canvas.mouseData.selectNode("n", CENTER, true);

      const applied = canvas.updateHeldNodePosition(Vec2.of(1000, 0));

      expect(applied.x).toBe(100);
      expect(node.position.x).toBe(100);
    });
  });

  describe("updateSettings", () => {
    it("snaps existing nodes when position snapping is turned on", () => {
      const canvas = createCanvas({ snapNodePositionToGrid: false });
      const node = canvas.addNode({ id: "n", position: { x: 13, y: 7 } }, false);

      canvas.updateSettings({ snapNodePositionToGrid: true });

      expect(node.position).toEqual(Vec2.of(20, 0));
    });

    it("re-snaps existing nodes when the grid size changes", () => {
      const canvas = createCanvas();
      const node = canvas.addNode({ id: "n", position: { x: 60, y: 60 } }, false);

      canvas.updateSettings({ gridSize: 50 });

      expect(node.position).toEqual(Vec2.of(50, 50));
    });

    it("publishes a content change when size snapping changes", () => {
      const canvas = createCanvas();
      let changes = 0;
      canvas.eventStore.onContentChanged.subscribe("test", () => changes++);

      canvas.updateSettings({ snapNodeSizeToGrid: true });

      expect(changes).toBeGreaterThan(0);
    });
  });

  describe("snapSizeToGrid", () => {
    it("rounds up to whole cells, at least one", () => {
      const canvas = createCanvas({ snapNodeSizeToGrid: true });
      expect(canvas.snapSizeToGrid(Vec2.of(41, 40))).toEqual(Vec2.of(60, 40));
      expect(canvas.snapSizeToGrid(Vec2.of(0, 3))).toEqual(Vec2.of(20, 20));
    });

    it("returns the size unchanged when size snapping is off", () => {
      const canvas = createCanvas();
      expect(canvas.snapSizeToGrid(Vec2.of(41, 3))).toEqual(Vec2.of(41, 3));
    });
  });
});
