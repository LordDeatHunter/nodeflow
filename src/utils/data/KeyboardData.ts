import { createStore, produce } from "solid-js/store";
import { KeyboardDataType } from "../../nodeflow-types";
import { NodeflowData } from "./index";
import { KeyboardKeyCode } from "../constants";
import { intersectionOfSets, isSetEmpty } from "../misc-utils";

export default class KeyboardData {
  private readonly store;
  private readonly nodeflowData: NodeflowData;

  /**
   * @param nodeflowData - The nodeflow object of the canvas that this keyboard data will be used in
   */
  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
    this.store = createStore<KeyboardDataType>({
      heldKeys: new Set<KeyboardKeyCode>(),
    });
  }

  public get heldKeys(): Set<KeyboardKeyCode> {
    return this.store[0].heldKeys;
  }

  public set heldKeys(keys: Set<KeyboardKeyCode>) {
    this.store[1]({ heldKeys: keys });
  }

  public releaseKey(key: KeyboardKeyCode): void {
    this.store[1](produce((state) => state.heldKeys.delete(key)));
  }

  public clearKeys() {
    this.store[1]({ heldKeys: new Set<KeyboardKeyCode>() });
  }

  public pressKey(key: KeyboardKeyCode): void {
    this.store[1](produce((state) => state.heldKeys.add(key)));
  }

  public hasKeyPressed(key: KeyboardKeyCode): boolean {
    return this.heldKeys.has(key);
  }

  public isActionPressed(keymap: Set<KeyboardKeyCode>) {
    return !isSetEmpty(intersectionOfSets(this.heldKeys, keymap));
  }
}
