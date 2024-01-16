import { createStore } from "solid-js/store";
import { ConnectorSection as ConnectorSectionData } from "../../drawflow-types/types";
import NodeConnector from "./NodeConnector";

export default class ConnectorSection {
  private readonly store;

  constructor(data: ConnectorSectionData) {
    this.store = createStore<ConnectorSectionData>(data);
  }

  public get connectors() {
    return this.store[0].connectors;
  }

  public get css() {
    return this.store[0].css;
  }

  public get id() {
    return this.store[0].id;
  }

  public get parentNode() {
    return this.store[0].parentNode;
  }

  public set connectors(value) {
    this.store[1]({ connectors: value });
  }

  public set css(value) {
    this.store[1]({ css: value });
  }

  public set id(value) {
    this.store[1]({ id: value });
  }

  public set parentNode(value) {
    this.store[1]({ parentNode: value });
  }

  public update(data: Partial<ConnectorSectionData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: ConnectorSectionData) => Partial<ConnectorSectionData>,
  ) {
    this.store[1](updater);
  }

  public removeIncomingConnections() {
    this.connectors.forEach((connector) =>
      connector.removeIncomingConnections(),
    );
  }

  public removeOutgoingConnections() {
    this.connectors.forEach((connector) =>
      connector.removeOutgoingConnections(),
    );
  }

  public getSourceConnectors(): NodeConnector[] {
    return Array.from(this.connectors.values()).flatMap((connector) =>
      connector.sources.flatMap((source) => source.sourceConnector),
    );
  }

  public getDestinationConnectors(): NodeConnector[] {
    return Array.from(this.connectors.values()).flatMap((connector) =>
      connector.destinations.flatMap(
        (destination) => destination.destinationConnector,
      ),
    );
  }
}
