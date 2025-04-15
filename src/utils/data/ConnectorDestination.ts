import { ConnectorDestinationType } from "../../nodeflow-types";

/**
 * Represents a connector's destination data, such as the destination connector and the curve data between the two.
 */
export default class ConnectorDestination {
  private store: ConnectorDestinationType;

  constructor(data: ConnectorDestinationType) {
    this.store = data;
  }

  public get css() {
    return this.store.css;
  }

  public get destinationConnector() {
    return this.store.destinationConnector;
  }

  public get path() {
    return this.store.path;
  }

  public set css(value) {
    this.store.css = value;
  }

  public set path(value) {
    this.store.path = value;
  }

  public set destinationConnector(value) {
    this.store.destinationConnector = value;
  }

  public update(data: Partial<ConnectorDestinationType>) {
    this.store = { ...this.store, ...data };
  }

  /**
   * Updates the ConnectorDestination instance with the provided data using the current data as a base.
   *
   * @example
   * connectorDestination.updateWithPrevious((prev) => ({
   *   css: {
   *     normal: prev.css.normal,
   *   },
   * }));
   */
  public updateWithPrevious(
    updater: (data: ConnectorDestinationType) => ConnectorDestinationType,
  ) {
    this.update(updater(this.store));
  }
}
