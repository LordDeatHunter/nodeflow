import { Change, SerializedChanges } from "./nodeflow-types";

export default class Changes {
  private changes: Array<Change>;
  private currentChangeIndex = -1;
  private maxChanges;

  public constructor(maxChanges: number = -1) {
    this.maxChanges = maxChanges;
    this.changes = [];
  }

  public serialize(): SerializedChanges {
    return {
      changes: this.changes,
      currentChangeIndex: this.currentChangeIndex,
      maxChanges: this.maxChanges,
    };
  }

  public deserialize(data: SerializedChanges): void {
    this.changes = data.changes;
    this.currentChangeIndex = data.currentChangeIndex;
    this.maxChanges = data.maxChanges;
  }

  public addChange(change: Change): void {
    this.changes = this.changes.slice(0, this.currentChangeIndex + 1);
    if (this.changes.length === this.maxChanges) {
      this.changes.shift();
    }
    this.changes.push(change);
    this.currentChangeIndex = this.changes.length - 1;
  }

  public undo(): boolean {
    if (this.currentChangeIndex === -1) {
      return false;
    }

    const currentGroup = this.changes[this.currentChangeIndex].historyGroup;

    while (
      this.currentChangeIndex > -1 &&
      this.changes[this.currentChangeIndex].historyGroup === currentGroup
    ) {
      this.changes[this.currentChangeIndex].undoChange();
      this.currentChangeIndex--;
    }

    return true;
  }

  public redo(): boolean {
    if (this.currentChangeIndex === this.changes.length - 1) {
      return false;
    }

    const currentGroup = this.changes[this.currentChangeIndex + 1].historyGroup;

    while (
      this.currentChangeIndex < this.changes.length - 1 &&
      this.changes[this.currentChangeIndex + 1].historyGroup === currentGroup
    ) {
      this.currentChangeIndex++;
      this.changes[this.currentChangeIndex].applyChange();
    }

    return true;
  }

  public static evaluateHistoryGroup(historyGroup: string | boolean = true) {
    if (typeof historyGroup === "boolean") {
      return historyGroup ? crypto.randomUUID() : false;
    }
    return historyGroup;
  }
}
