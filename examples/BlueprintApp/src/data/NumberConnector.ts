import { CustomConnectorData, Optional } from "nodeflow-lib";
import { createStore } from "solid-js/store";

export default class NumberConnector extends CustomConnectorData {
  private readonly store;

  constructor(value: Optional<number>) {
    super();
    this.store = createStore({ type: "number", value });
  }

  public serialize(): CustomNodeConnectorDataType {
    return {
      type: "number",
      value: this.value,
    };
  }

  get type(): string {
    return "number";
  }

  get value() {
    return this.store[0].value;
  }
}
