import { CustomConnectorData, deepCopy } from "nodeflow-lib";
import { createStore } from "solid-js/store";

export default class AnyConnector extends CustomConnectorData {
  private readonly store;

  constructor(data: unknown = undefined) {
    super();
    this.store = createStore({ value: data });
  }

  public serialize(): CustomNodeConnectorDataType {
    return {
      type: "any",
      value: deepCopy(this.value),
    };
  }

  get type(): string {
    return "any";
  }

  get value() {
    return this.store[0].value;
  }
}
