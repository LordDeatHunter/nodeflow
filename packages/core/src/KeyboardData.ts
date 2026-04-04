import { KeyboardDataType } from "./types";
import { KeyboardKeyCode } from "./constants";
import { intersectionOfSets, isSetEmpty } from "./misc-utils";

export default class KeyboardData {
  private _heldKeys: Set<KeyboardKeyCode> = new Set<KeyboardKeyCode>();
  private readonly nodeflowData: any;

  /**
   * @param nodeflowData - The nodeflow object of the canvas that this keyboard data will be used in
   */
  public constructor(nodeflowData: any) {
    this.nodeflowData = nodeflowData;
  }

  public get heldKeys(): Set<KeyboardKeyCode> {
    return this._heldKeys;
  }

  public set heldKeys(keys: Set<KeyboardKeyCode>) {
    this._heldKeys = keys;
  }

  public releaseKey(key: KeyboardKeyCode): void {
    this._heldKeys.delete(key);
  }

  public clearKeys() {
    this._heldKeys = new Set<KeyboardKeyCode>();
  }

  public pressKey(key: KeyboardKeyCode): void {
    this._heldKeys.add(key);
  }

  public hasKeyPressed(key: KeyboardKeyCode): boolean {
    return this._heldKeys.has(key);
  }

  public isActionPressed(keymap: Set<KeyboardKeyCode>) {
    return !isSetEmpty(intersectionOfSets(this._heldKeys, keymap));
  }
}
