import { CustomConnectorData } from "nodeflow-lib";
import { createStore } from "solid-js/store";

export default class InputData extends CustomConnectorData {
  private readonly store;

  constructor(type: string) {
    super();
    this.store = createStore({ type });
  }

  public serialize(): CustomNodeConnectorDataType {
    return {
      origin: "input",
      storedData: {
        value: undefined,
      }
    };
  }

  get type(): string {
    return this.store[0].type;
  }

  set type(value: string) {
    this.store[0].type = value;
  }
}
