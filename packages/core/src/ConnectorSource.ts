import { ConnectorSourceType } from "./nodeflow-types";

export default class ConnectorSource {
  public sourceConnector: ConnectorSourceType["sourceConnector"];

  constructor(data: ConnectorSourceType) {
    this.sourceConnector = data.sourceConnector;
  }

  public update(data: Partial<ConnectorSourceType>) {
    if (data.sourceConnector !== undefined)
      this.sourceConnector = data.sourceConnector;
  }

  public updateWithPrevious(
    updater: (data: ConnectorSourceType) => ConnectorSourceType,
  ) {
    const updated = updater({ sourceConnector: this.sourceConnector });
    this.update(updated);
  }
}
