import { createStore } from "solid-js/store";
import {
  ConnectorSectionType,
  SerializedConnectorSection,
  SerializedNodeConnector,
} from "../../drawflow-types";
import NodeConnector from "./NodeConnector";
import { drawflow } from "../drawflow-storage";

export default class ConnectorSection {
  private readonly store;

  constructor(data: ConnectorSectionType) {
    this.store = createStore<ConnectorSectionType>(data);
  }

  public serialize(): SerializedConnectorSection {
    return {
      connectors: Object.fromEntries(
        Array.from(this.connectors.entries()).map(([id, connector]) => [
          id,
          connector.serialize(),
        ]),
      ),
      css: this.css,
      id: this.id,
    };
  }

  public removeConnector(connectorId: string, addToHistory = true) {
    if (!this.connectors.has(connectorId)) {
      return;
    }
    const connector = this.connectors.get(connectorId)!;

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "remove",
        source: "connector",
        applyChange: () => {
          this.removeConnector(connectorId, false);
        },
        undoChange: () => {
          this.addConnector(connector.serialize(), false);
        },
      });
    }

    this.connectors.delete(connectorId);
  }

  public addConnector(
    data: Partial<SerializedNodeConnector>,
    addToHistory = true,
  ) {
    const connector = NodeConnector.deserialize(data, this);

    if (this.connectors.has(connector.id)) {
      return;
    }

    if (addToHistory) {
      drawflow.changes.addChange({
        type: "add",
        source: "connector",
        applyChange: () => {
          this.addConnector(connector.serialize(), false);
        },
        undoChange: () => {
          this.removeConnector(connector.id, false);
        },
      });
    }

    this.connectors.set(connector.id, connector);

    return connector;
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

  public update(data: Partial<ConnectorSectionType>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: ConnectorSectionType) => Partial<ConnectorSectionType>,
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
