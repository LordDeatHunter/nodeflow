import { describe, it, expect, beforeEach } from "bun:test";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import { MOUSE_BUTTONS } from "../src/constants";

describe("MouseData", () => {
  let nodeflowData: NodeflowData;

  beforeEach(() => {
    nodeflowData = new NodeflowData("test-canvas");
  });

  describe("default state", () => {
    it("has mousePosition at (0, 0) by default", () => {
      const pos = nodeflowData.mouseData.mousePosition;
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it("has no held mouse buttons by default", () => {
      expect(nodeflowData.mouseData.heldMouseButtons.size).toBe(0);
    });

    it("has undefined clickStartPosition by default", () => {
      expect(nodeflowData.mouseData.clickStartPosition).toBeUndefined();
    });

    it("has empty selections by default", () => {
      expect(nodeflowData.mouseData.heldNodes).toHaveLength(0);
      expect(nodeflowData.mouseData.heldConnectors).toHaveLength(0);
      expect(nodeflowData.mouseData.heldConnections).toHaveLength(0);
    });
  });

  describe("mousePosition setter", () => {
    it("updates the mouse position when set", () => {
      const newPos = Vec2.of(100, 200);
      nodeflowData.mouseData.mousePosition = newPos;
      expect(nodeflowData.mouseData.mousePosition.x).toBe(100);
      expect(nodeflowData.mouseData.mousePosition.y).toBe(200);
    });

    it("updates mouse position multiple times", () => {
      nodeflowData.mouseData.mousePosition = Vec2.of(50, 75);
      expect(nodeflowData.mouseData.mousePosition.x).toBe(50);
      nodeflowData.mouseData.mousePosition = Vec2.of(300, 400);
      expect(nodeflowData.mouseData.mousePosition.x).toBe(300);
      expect(nodeflowData.mouseData.mousePosition.y).toBe(400);
    });
  });

  describe("clickStartPosition setter", () => {
    it("updates clickStartPosition when set", () => {
      const pos = Vec2.of(10, 20);
      nodeflowData.mouseData.clickStartPosition = pos;
      expect(nodeflowData.mouseData.clickStartPosition?.x).toBe(10);
      expect(nodeflowData.mouseData.clickStartPosition?.y).toBe(20);
    });

    it("can clear clickStartPosition by setting to undefined", () => {
      nodeflowData.mouseData.clickStartPosition = Vec2.of(5, 5);
      nodeflowData.mouseData.clickStartPosition = undefined;
      expect(nodeflowData.mouseData.clickStartPosition).toBeUndefined();
    });
  });

  describe("isHoldingButton", () => {
    it("returns false when no button is held", () => {
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(
        false,
      );
    });

    it("returns true after a button is added via update", () => {
      const buttons = new Set<MOUSE_BUTTONS>([MOUSE_BUTTONS.LEFT]);
      nodeflowData.mouseData.update({ heldMouseButtons: buttons });
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(
        true,
      );
    });

    it("returns false for a button that is not held when another is", () => {
      const buttons = new Set<MOUSE_BUTTONS>([MOUSE_BUTTONS.RIGHT]);
      nodeflowData.mouseData.update({ heldMouseButtons: buttons });
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(
        false,
      );
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.RIGHT)).toBe(
        true,
      );
    });

    it("reflects multiple held buttons", () => {
      const buttons = new Set<MOUSE_BUTTONS>([
        MOUSE_BUTTONS.LEFT,
        MOUSE_BUTTONS.MIDDLE,
      ]);
      nodeflowData.mouseData.update({ heldMouseButtons: buttons });
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(
        true,
      );
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.MIDDLE)).toBe(
        true,
      );
      expect(nodeflowData.mouseData.isHoldingButton(MOUSE_BUTTONS.RIGHT)).toBe(
        false,
      );
    });
  });

  describe("pointerDown setter", () => {
    it("can set pointerDown to true without throwing", () => {
      nodeflowData.mouseData.pointerDown = true;
      nodeflowData.mouseData.reset();
      expect(nodeflowData.mouseData.mousePosition.x).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears clickStartPosition after reset", () => {
      nodeflowData.mouseData.clickStartPosition = Vec2.of(10, 10);
      nodeflowData.mouseData.reset();
      expect(nodeflowData.mouseData.clickStartPosition).toBeUndefined();
    });

    it("clears held mouse buttons after reset", () => {
      nodeflowData.mouseData.update({
        heldMouseButtons: new Set([MOUSE_BUTTONS.LEFT, MOUSE_BUTTONS.RIGHT]),
      });
      nodeflowData.mouseData.reset();
      expect(nodeflowData.mouseData.heldMouseButtons.size).toBe(0);
    });

    it("clears selections after reset", () => {
      nodeflowData.mouseData.selectNodeflow();
      nodeflowData.mouseData.reset();
      expect(nodeflowData.mouseData.hasSelectedNodeflow()).toBe(false);
    });
  });

  describe("hasSelectedNodeflow", () => {
    it("returns false when nodeflow is not selected", () => {
      expect(nodeflowData.mouseData.hasSelectedNodeflow()).toBe(false);
    });

    it("returns true after selectNodeflow is called", () => {
      nodeflowData.mouseData.selectNodeflow();
      expect(nodeflowData.mouseData.hasSelectedNodeflow()).toBe(true);
    });
  });
});
