import { Change, SerializedChanges } from "../../nodeflow-types";

export default class Changes {
  // TODO: explore other data structures for this
  private changes: Array<Change>;
  /**
   * The index of the current change in the changes array.
   * -1 means no changes have been made yet, or all changes have been undone.
   */
  private currentChangeIndex = -1;
  private maxChanges;

  constructor(maxChanges: number = -1) {
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

  public deserialize(data: SerializedChanges) {
    this.changes = data.changes;
    this.currentChangeIndex = data.currentChangeIndex;
    this.maxChanges = data.maxChanges;
  }

  // TODO: maybe store the undo'd value, or find a similar way to fix "skipped" changes, ex. undoing and redoing the creation of a node doesn't bring back externally added data, ex. via addConnector
  public addChange(change: Change) {
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
    this.changes[this.currentChangeIndex].undoChange();
    this.currentChangeIndex--;
    return true;
  }

  public redo(): boolean {
    if (this.currentChangeIndex === this.changes.length - 1) {
      return false;
    }
    this.currentChangeIndex++;
    this.changes[this.currentChangeIndex].applyChange();
    return true;
  }
}
