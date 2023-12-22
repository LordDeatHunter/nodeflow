type Change = {
  type: "add" | "remove" | "update";
  source: string;
  applyChange: () => void;
  undoChange: () => void;
};

export class Changes {
  private changes: Array<Change> = [];
  private currentChangeIndex = -1;

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
