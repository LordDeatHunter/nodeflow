import { Change, SerializedChanges } from "../../drawflow-types";

export default class Changes {
  private changes: Array<Change> = [];
  private currentChangeIndex = -1;
  // TODO: add a max number of changes
  // TODO: maybe store the undo'd value, or find a similar way to fix "skipped" changes, ex. undoing and redoing the creation of a node doesn't bring back externally added data, ex. via addConnector

  public serialize(): SerializedChanges {
    return {
      changes: this.changes,
      currentChangeIndex: this.currentChangeIndex,
    };
  }

  public deserialize(data: SerializedChanges) {
    this.changes = data.changes;
    this.currentChangeIndex = data.currentChangeIndex;
  }

  public addChange(change: Change) {
    this.changes = this.changes.slice(0, this.currentChangeIndex + 1);
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
