import { describe, it, expect, beforeEach } from "bun:test";
import NodeflowData from "../../../src/utils/data/NodeflowData";
import { KEYBOARD_KEY_CODES } from "../../../src/utils/constants";

describe("KeyboardData", () => {
  let nodeflowData: NodeflowData;

  beforeEach(() => {
    nodeflowData = new NodeflowData("test-canvas");
  });

  describe("default state", () => {
    it("has no keys held by default", () => {
      expect(nodeflowData.keyboardData.heldKeys.size).toBe(0);
    });

    it("hasKeyPressed returns false for any key when none are held", () => {
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_A),
      ).toBe(false);
    });

    it("isActionPressed returns false when no keys are held", () => {
      const keymap = new Set([KEYBOARD_KEY_CODES.CONTROL_LEFT]);
      expect(nodeflowData.keyboardData.isActionPressed(keymap)).toBe(false);
    });
  });

  describe("pressKey", () => {
    it("adds a key to heldKeys", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      expect(
        nodeflowData.keyboardData.heldKeys.has(KEYBOARD_KEY_CODES.KEY_A),
      ).toBe(true);
    });

    it("increases heldKeys size by 1 per unique key", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_B);
      expect(nodeflowData.keyboardData.heldKeys.size).toBe(2);
    });

    it("does not duplicate a key pressed twice", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      expect(nodeflowData.keyboardData.heldKeys.size).toBe(1);
    });

    it("makes hasKeyPressed return true for the pressed key", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.SHIFT_LEFT);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.SHIFT_LEFT),
      ).toBe(true);
    });
  });

  describe("releaseKey", () => {
    it("removes a held key", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_Z);
      nodeflowData.keyboardData.releaseKey(KEYBOARD_KEY_CODES.KEY_Z);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_Z),
      ).toBe(false);
    });

    it("only removes the specified key, leaving others intact", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_B);
      nodeflowData.keyboardData.releaseKey(KEYBOARD_KEY_CODES.KEY_A);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_A),
      ).toBe(false);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_B),
      ).toBe(true);
    });

    it("is a no-op when releasing a key that was not held", () => {
      nodeflowData.keyboardData.releaseKey(KEYBOARD_KEY_CODES.ESCAPE);
      expect(nodeflowData.keyboardData.heldKeys.size).toBe(0);
    });
  });

  describe("clearKeys", () => {
    it("removes all held keys at once", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_B);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.CONTROL_LEFT);
      nodeflowData.keyboardData.clearKeys();
      expect(nodeflowData.keyboardData.heldKeys.size).toBe(0);
    });
  });

  describe("isActionPressed", () => {
    it("returns true when at least one key in the keymap is held", () => {
      const keymap = new Set([
        KEYBOARD_KEY_CODES.CONTROL_LEFT,
        KEYBOARD_KEY_CODES.CONTROL_RIGHT,
      ]);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.CONTROL_RIGHT);
      expect(nodeflowData.keyboardData.isActionPressed(keymap)).toBe(true);
    });

    it("returns false when none of the keymap keys are held", () => {
      const keymap = new Set([
        KEYBOARD_KEY_CODES.SHIFT_LEFT,
        KEYBOARD_KEY_CODES.SHIFT_RIGHT,
      ]);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      expect(nodeflowData.keyboardData.isActionPressed(keymap)).toBe(false);
    });

    it("returns true for multiple keys when all are in the keymap", () => {
      const keymap = new Set([
        KEYBOARD_KEY_CODES.KEY_W,
        KEYBOARD_KEY_CODES.ARROW_UP,
      ]);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_W);
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.ARROW_UP);
      expect(nodeflowData.keyboardData.isActionPressed(keymap)).toBe(true);
    });
  });

  describe("heldKeys setter", () => {
    it("replaces the entire held keys set", () => {
      nodeflowData.keyboardData.pressKey(KEYBOARD_KEY_CODES.KEY_A);
      const newKeys = new Set([
        KEYBOARD_KEY_CODES.KEY_X,
        KEYBOARD_KEY_CODES.KEY_Y,
      ]);
      nodeflowData.keyboardData.heldKeys = newKeys;
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_A),
      ).toBe(false);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_X),
      ).toBe(true);
      expect(
        nodeflowData.keyboardData.hasKeyPressed(KEYBOARD_KEY_CODES.KEY_Y),
      ).toBe(true);
    });
  });
});
