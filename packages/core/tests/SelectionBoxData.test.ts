import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";

describe("SelectionBoxData", () => {
  let nodeflowData: NodeflowData;

  beforeEach(() => {
    nodeflowData = new NodeflowData("test-canvas");
  });

  describe("default state", () => {
    it("has no bounding box (undefined) by default", () => {
      expect(nodeflowData.mouseData.selectionBox.boundingBox).toBeUndefined();
    });

    it("has an empty selections map by default", () => {
      const selectionBox = nodeflowData.mouseData.selectionBox;
      expect(selectionBox.selections.selectedNodes).toHaveLength(0);
    });
  });

  describe("boundingBox setter — setting a Rect", () => {
    it("stores the bounding box after setting it", () => {
      const rect = Rect.of(Vec2.of(10, 20), Vec2.of(100, 80));
      nodeflowData.mouseData.selectionBox.boundingBox = rect;

      const stored = nodeflowData.mouseData.selectionBox.boundingBox;
      expect(stored).not.toBeUndefined();
      expect(stored!.position.x).toBe(10);
      expect(stored!.position.y).toBe(20);
      expect(stored!.size.x).toBe(100);
      expect(stored!.size.y).toBe(80);
    });

    it("updates the bounding box when set to a different Rect", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(0, 0),
        Vec2.of(50, 50),
      );
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(100, 200),
        Vec2.of(300, 400),
      );

      const stored = nodeflowData.mouseData.selectionBox.boundingBox;
      expect(stored!.position.x).toBe(100);
      expect(stored!.position.y).toBe(200);
    });

    it("highlights no nodes when canvas has no nodes", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(0, 0),
        Vec2.of(9999, 9999),
      );
      expect(
        nodeflowData.mouseData.selectionBox.selections.selectedNodes,
      ).toHaveLength(0);
    });
  });

  describe("boundingBox setter — clearing with undefined", () => {
    it("clears the bounding box when set to undefined", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(0, 0),
        Vec2.of(50, 50),
      );
      nodeflowData.mouseData.selectionBox.boundingBox = undefined;

      expect(nodeflowData.mouseData.selectionBox.boundingBox).toBeUndefined();
    });

    it("clears the internal selections when bounding box is cleared", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(0, 0),
        Vec2.of(50, 50),
      );
      nodeflowData.mouseData.selectionBox.boundingBox = undefined;

      expect(
        nodeflowData.mouseData.selectionBox.selections.selectedNodes,
      ).toHaveLength(0);
    });

    it("is a no-op setting undefined when already undefined", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = undefined;
      expect(nodeflowData.mouseData.selectionBox.boundingBox).toBeUndefined();
    });
  });

  describe("selections property", () => {
    it("selections returns a SelectionMap instance (not null/undefined)", () => {
      expect(nodeflowData.mouseData.selectionBox.selections).not.toBeNull();
      expect(
        nodeflowData.mouseData.selectionBox.selections,
      ).not.toBeUndefined();
    });

    it("selections are transferred to mouseData when bounding box is cleared", () => {
      nodeflowData.mouseData.selectionBox.boundingBox = Rect.of(
        Vec2.of(0, 0),
        Vec2.of(50, 50),
      );
      nodeflowData.mouseData.selectionBox.boundingBox = undefined;

      expect(nodeflowData.mouseData.heldNodes).toHaveLength(0);
    });
  });
});
