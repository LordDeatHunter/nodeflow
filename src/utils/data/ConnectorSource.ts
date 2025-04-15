import { ConnectorSourceType } from "../../nodeflow-types";

/**
 * Represents a connector's source data, such as the source connector that is connected to the original connector and the curve data between the two.
 */
export default class ConnectorSource {
  private store;

  constructor(data: ConnectorSourceType) {
    this.store = data;
  }

  public get sourceConnector() {
    return this.store.sourceConnector;
  }

  public set sourceConnector(value) {
    this.store.sourceConnector = value;
  }

  public update(data: Partial<ConnectorSourceType>) {
    this.store = { ...this.store, ...data };
  }

  public updateWithPrevious(
    updater: (data: ConnectorSourceType) => ConnectorSourceType,
  ) {
    this.update(updater(this.store));
  }
}
