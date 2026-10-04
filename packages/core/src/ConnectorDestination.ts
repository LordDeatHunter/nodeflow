import { ConnectorDestinationType } from "./nodeflow-types";

export default class ConnectorDestination {
  public css: ConnectorDestinationType["css"];
  public dash: ConnectorDestinationType["dash"];
  public destinationConnector: ConnectorDestinationType["destinationConnector"];
  public path: ConnectorDestinationType["path"];
  public shape: ConnectorDestinationType["shape"];

  constructor(data: ConnectorDestinationType) {
    this.css = data.css;
    this.dash = data.dash;
    this.destinationConnector = data.destinationConnector;
    this.path = data.path;
    this.shape = data.shape;
  }

  public update(data: Partial<ConnectorDestinationType>) {
    if (data.css !== undefined) this.css = data.css;
    if (data.dash !== undefined) this.dash = data.dash;
    if (data.destinationConnector !== undefined)
      this.destinationConnector = data.destinationConnector;
    if (data.path !== undefined) this.path = data.path;
    if (data.shape !== undefined) this.shape = data.shape;
  }

  public updateWithPrevious(
    updater: (data: ConnectorDestinationType) => ConnectorDestinationType,
  ) {
    const updated = updater({
      css: this.css,
      dash: this.dash,
      destinationConnector: this.destinationConnector,
      path: this.path,
      shape: this.shape,
    });
    this.update(updated);
  }
}
