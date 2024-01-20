import { createStore } from "solid-js/store";
import { ConnectorDestination as ConnectorDestinationData } from "../../drawflow-types";

export default class ConnectorDestination {
  private readonly store;

  constructor(data: ConnectorDestinationData) {
    this.store = createStore<ConnectorDestinationData>(data);
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

  public update(data: Partial<ConnectorDestinationData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: ConnectorDestinationData) => ConnectorDestinationData,
  ) {
    this.store[1](updater);
  }
}
