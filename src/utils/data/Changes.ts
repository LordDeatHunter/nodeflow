import { Change, SerializedChanges } from "../../nodeflow-types";

// TODO: explore other data structures for this
// TODO: maybe store the undo'd value, or find a similar way to fix "skipped" changes, ex. undoing and redoing the creation of a node doesn't bring back externally added data, ex. via addConnector

/**
 * Changes class is responsible for managing changes made to the data.\
 * It provides methods to add, undo and redo changes, as well as serialize and deserialize the data.
 */
export default class Changes {
  private changes: Array<Change>;
  /**
   * The index of the current change in the changes array.\
   * -1 means no changes have been made yet, or all changes have been undone.
   */
  private currentChangeIndex = -1;
  private maxChanges;

  /**
   * @param {number} maxChanges - The maximum number of changes that can be stored. Default is -1, which means no limit.
   */
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

  /**
   * Adds a new change to the changes array.\
   * If the current change is not the last change, all changes after the current change are removed.\
   * If the changes array is at max capacity, the first change is removed.\
   * The current change is set to the newly added change.
   * @param {Change} change - The change to add.
   * @returns {void}
   */
  public addChange(change: Change): void {
    this.changes = this.changes.slice(0, this.currentChangeIndex + 1);
    if (this.changes.length === this.maxChanges) {
      this.changes.shift();
    }
    this.changes.push(change);
    this.currentChangeIndex = this.changes.length - 1;
  }

  /**
   * Undoes the most recent change.
   * @returns {boolean} - Returns true if the undo operation was successful, false if there are no changes to undo.
   */ public undo(): boolean {
    if (this.currentChangeIndex === -1) {
      return false;
    }
    this.changes[this.currentChangeIndex].undoChange();
    this.currentChangeIndex--;
    return true;
  }

  /**
   * Redoes the most recently undone change.
   * @returns {boolean} - Returns true if the redo operation was successful, false if there are no changes to redo.
   */
  public redo(): boolean {
    if (this.currentChangeIndex === this.changes.length - 1) {
      return false;
    }
    this.currentChangeIndex++;
    this.changes[this.currentChangeIndex].applyChange();
    return true;
  }
}
