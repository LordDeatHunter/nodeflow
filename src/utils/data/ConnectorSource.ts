import { createStore } from "solid-js/store";
import { ConnectorSource as ConnectorSourceData } from "../../drawflow-types";

export default class ConnectorDestination {
  private readonly store;

  constructor(data: ConnectorSourceData) {
    this.store = createStore<ConnectorSourceData>(data);
  }

  public get sourceConnector() {
    return this.store[0].sourceConnector;
  }

  public set sourceConnector(value) {
    this.store[1]({ sourceConnector: value });
  }

  public update(data: Partial<ConnectorSourceData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: ConnectorSourceData) => ConnectorSourceData,
  ) {
    this.store[1](updater);
  }
}
