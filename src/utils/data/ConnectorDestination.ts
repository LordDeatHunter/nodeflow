import { createStore } from "solid-js/store";
import { ConnectorDestinationType } from "../../nodeflow-types";

/**
 * Represents a connector's destination data, such as the destination connector and the curve data between the two.
 */
export default class ConnectorDestination {
  private readonly store;

  constructor(data: ConnectorDestinationType) {
    this.store = createStore<ConnectorDestinationType>(data);
  }

  public get css() {
    return this.store[0].css;
  }

  public get destinationConnector() {
    return this.store[0].destinationConnector;
  }

  public get path() {
    return this.store[0].path;
  }

  public set css(value) {
    this.store[1]({ css: value });
  }

  public set path(value) {
    this.store[1]({ path: value });
  }

  public set destinationConnector(value) {
    this.store[1]({ destinationConnector: value });
  }

  public update(data: Partial<ConnectorDestinationType>) {
    this.store[1](data);
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
    this.store[1](updater);
  }
}
