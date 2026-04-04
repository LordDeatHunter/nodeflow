import { ConnectorDestinationType } from "./nodeflow-types";

export default class ConnectorDestination {
  public css: ConnectorDestinationType["css"];
  public destinationConnector: ConnectorDestinationType["destinationConnector"];
  public path: ConnectorDestinationType["path"];

  constructor(data: ConnectorDestinationType) {
    this.css = data.css;
    this.destinationConnector = data.destinationConnector;
    this.path = data.path;
  }

  public update(data: Partial<ConnectorDestinationType>) {
    if (data.css !== undefined) this.css = data.css;
    if (data.destinationConnector !== undefined)
      this.destinationConnector = data.destinationConnector;
    if (data.path !== undefined) this.path = data.path;
  }

  public updateWithPrevious(
    updater: (data: ConnectorDestinationType) => ConnectorDestinationType,
  ) {
    const updated = updater({
      css: this.css,
      destinationConnector: this.destinationConnector,
      path: this.path,
    });
    this.update(updated);
  }
}
