import { CustomConnectorData } from "nodeflow-lib";
import { createStore } from "solid-js/store";

export default class OutputData<T> extends CustomConnectorData {

  private readonly store;
  constructor(type: string, defaultValue: T) {
    super();
    this.store = createStore({ type, value: defaultValue });
  }

  public serialize(): CustomNodeConnectorDataType {
    return {
      origin: "output",
      storedData: {
        value: this.value,
      },
    };
  }

  get type(): string {
    return this.store[0].type;
  }

  get value(): T {
    return this.store[0].value;
  }

  set type(value: string) {
    this.store[1]({ type: value });
  }

  set value(value: T) {
    this.store[1]({ value });
  }
}
