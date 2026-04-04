import { describe, it, expect, beforeEach } from "bun:test";
import Changes from "../../../src/utils/data/Changes";
import type { Change } from "../../../src/nodeflow-types/types";

let groupCounter = 0;

function makeChange(
  applyFn: () => void = () => {},
  undoFn: () => void = () => {},
  group?: string,
): Change {
  return {
    type: "update",
    source: "test",
    applyChange: applyFn,
    undoChange: undoFn,
    historyGroup: group ?? `group-${++groupCounter}`,
  };
}

describe("Changes (undo/redo system)", () => {
  beforeEach(() => {
    groupCounter = 0;
  });

  describe("constructor", () => {
    it("creates an empty history — undo and redo both return false", () => {
      const changes = new Changes();
      expect(changes.undo()).toBe(false);
      expect(changes.redo()).toBe(false);
    });

    it("stores maxChanges and initial state in serialize()", () => {
      const changes = new Changes(5);
      const {
        maxChanges,
        currentChangeIndex,
        changes: history,
      } = changes.serialize();
      expect(maxChanges).toBe(5);
      expect(currentChangeIndex).toBe(-1);
      expect(history).toHaveLength(0);
    });
  });

  describe("addChange()", () => {
    it("records the change without invoking either callback", () => {
      const changes = new Changes();
      let applyCount = 0;
      let undoCount = 0;

      changes.addChange(
        makeChange(
          () => applyCount++,
          () => undoCount++,
        ),
      );

      expect(applyCount).toBe(0);
      expect(undoCount).toBe(0);

      const { changes: history, currentChangeIndex } = changes.serialize();
      expect(history).toHaveLength(1);
      expect(currentChangeIndex).toBe(0);
    });

    it("tracks currentChangeIndex correctly across multiple additions", () => {
      const changes = new Changes();
      changes.addChange(makeChange());
      changes.addChange(makeChange());
      changes.addChange(makeChange());

      const { changes: history, currentChangeIndex } = changes.serialize();
      expect(history).toHaveLength(3);
      expect(currentChangeIndex).toBe(2);
    });
  });

  describe("undo()", () => {
    it("calls undoChange on the most recent change and returns true", () => {
      const changes = new Changes();
      let undoCalled = false;

      changes.addChange(
        makeChange(undefined, () => {
          undoCalled = true;
        }),
      );

      expect(changes.undo()).toBe(true);
      expect(undoCalled).toBe(true);
    });

    it("decrements currentChangeIndex to -1 after undoing the sole change", () => {
      const changes = new Changes();
      changes.addChange(makeChange());
      changes.undo();

      expect(changes.serialize().currentChangeIndex).toBe(-1);
    });

    it("returns false when there are no changes to undo", () => {
      expect(new Changes().undo()).toBe(false);
    });

    it("returns false after all changes have been undone", () => {
      const changes = new Changes();
      changes.addChange(makeChange());
      changes.undo();

      expect(changes.undo()).toBe(false);
    });
  });

  describe("redo()", () => {
    it("calls applyChange after an undo and returns true", () => {
      const changes = new Changes();
      let applyCalled = false;

      changes.addChange(
        makeChange(() => {
          applyCalled = true;
        }),
      );
      changes.undo();

      expect(changes.redo()).toBe(true);
      expect(applyCalled).toBe(true);
    });

    it("returns false when there is nothing to redo (no prior undo)", () => {
      const changes = new Changes();
      changes.addChange(makeChange());

      expect(changes.redo()).toBe(false);
    });

    it("returns false when there are no changes at all", () => {
      expect(new Changes().redo()).toBe(false);
    });
  });

  describe("sequence of undo/redo", () => {
    it("undoes and redoes changes in the correct order", () => {
      const changes = new Changes();
      const log: string[] = [];

      changes.addChange(
        makeChange(
          () => log.push("redo-A"),
          () => log.push("undo-A"),
        ),
      );
      changes.addChange(
        makeChange(
          () => log.push("redo-B"),
          () => log.push("undo-B"),
        ),
      );
      changes.addChange(
        makeChange(
          () => log.push("redo-C"),
          () => log.push("undo-C"),
        ),
      );

      changes.undo();
      expect(log).toEqual(["undo-C"]);

      changes.undo();
      expect(log).toEqual(["undo-C", "undo-B"]);

      changes.redo();
      expect(log).toEqual(["undo-C", "undo-B", "redo-B"]);

      changes.redo();
      expect(log).toEqual(["undo-C", "undo-B", "redo-B", "redo-C"]);
    });
  });

  describe("addChange() after undo clears redo stack", () => {
    it("discards undone changes when a new change is added", () => {
      const changes = new Changes();
      let redoCalled = false;

      changes.addChange(makeChange());
      changes.addChange(
        makeChange(() => {
          redoCalled = true;
        }),
      );

      changes.undo();
      changes.addChange(makeChange());

      expect(changes.redo()).toBe(false);
      expect(redoCalled).toBe(false);
    });
  });

  describe("maxChanges limit", () => {
    it("drops the oldest change when at maximum capacity", () => {
      const changes = new Changes(3);
      const undoCalls: number[] = [];

      for (let i = 1; i <= 4; i++) {
        const n = i;
        changes.addChange(makeChange(undefined, () => undoCalls.push(n)));
      }

      expect(changes.serialize().changes).toHaveLength(3);

      changes.undo();
      changes.undo();
      changes.undo();

      expect(undoCalls).toEqual([4, 3, 2]);
    });
  });

  describe("serialize() / deserialize()", () => {
    it("restores state so undo still works after a round-trip", () => {
      const original = new Changes(10);
      let undoCalled = false;

      original.addChange(
        makeChange(undefined, () => {
          undoCalled = true;
        }),
      );
      const snapshot = original.serialize();

      const restored = new Changes();
      restored.deserialize(snapshot);

      const {
        currentChangeIndex,
        maxChanges,
        changes: history,
      } = restored.serialize();
      expect(history).toHaveLength(1);
      expect(currentChangeIndex).toBe(0);
      expect(maxChanges).toBe(10);

      expect(restored.undo()).toBe(true);
      expect(undoCalled).toBe(true);
    });

    it("replaces existing state entirely when deserializing an empty snapshot", () => {
      const target = new Changes();
      target.addChange(makeChange());
      target.addChange(makeChange());

      target.deserialize(new Changes(0).serialize());

      const { changes: history, currentChangeIndex } = target.serialize();
      expect(history).toHaveLength(0);
      expect(currentChangeIndex).toBe(-1);
    });
  });

  describe("historyGroup grouping", () => {
    it("undoes all same-group changes in a single undo() call", () => {
      const changes = new Changes();
      const log: string[] = [];
      const SAME_GROUP = "same-group";

      changes.addChange(
        makeChange(undefined, () => log.push("undo-A"), SAME_GROUP),
      );
      changes.addChange(
        makeChange(undefined, () => log.push("undo-B"), SAME_GROUP),
      );
      changes.addChange(
        makeChange(undefined, () => log.push("undo-C"), SAME_GROUP),
      );

      changes.undo();

      expect(log).toEqual(["undo-C", "undo-B", "undo-A"]);
      expect(changes.serialize().currentChangeIndex).toBe(-1);
    });

    it("only undoes the topmost historyGroup per undo() call", () => {
      const changes = new Changes();
      const log: string[] = [];

      changes.addChange(
        makeChange(undefined, () => log.push("undo-A"), "group-1"),
      );
      changes.addChange(
        makeChange(undefined, () => log.push("undo-B"), "group-2"),
      );
      changes.addChange(
        makeChange(undefined, () => log.push("undo-C"), "group-2"),
      );

      changes.undo();
      expect(log).toEqual(["undo-C", "undo-B"]);

      changes.undo();
      expect(log).toEqual(["undo-C", "undo-B", "undo-A"]);
    });
  });

  describe("Changes.evaluateHistoryGroup()", () => {
    it("returns false when passed false", () => {
      expect(Changes.evaluateHistoryGroup(false)).toBe(false);
    });

    it("generates a non-empty string UUID when passed true", () => {
      const group = Changes.evaluateHistoryGroup(true);
      expect(typeof group).toBe("string");
      expect((group as string).length).toBeGreaterThan(0);
    });

    it("returns the string unchanged when passed a string", () => {
      expect(Changes.evaluateHistoryGroup("my-group")).toBe("my-group");
    });

    it("generates a different UUID on each call with true", () => {
      const g1 = Changes.evaluateHistoryGroup(true);
      const g2 = Changes.evaluateHistoryGroup(true);
      expect(g1).not.toBe(g2);
    });
  });
});
