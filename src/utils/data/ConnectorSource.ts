import { createStore } from "solid-js/store";
import { ConnectorSourceType } from "../../nodeflow-types";

/**
 * Represents a connector's source data, such as the source connector that is connected to the original connector and the curve data between the two.
 */
export default class ConnectorSource {
  private readonly store;

  constructor(data: ConnectorSourceType) {
    this.store = createStore<ConnectorSourceType>(data);
  }

  public get sourceConnector() {
    return this.store[0].sourceConnector;
  }

  public set sourceConnector(value) {
    this.store[1]({ sourceConnector: value });
  }

  public update(data: Partial<ConnectorSourceType>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: ConnectorSourceType) => ConnectorSourceType,
  ) {
    this.store[1](updater);
  }
}
