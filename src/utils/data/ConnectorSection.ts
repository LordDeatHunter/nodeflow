import {
  ConnectorSectionType,
  SerializedConnectorSection,
  SerializedNodeConnector,
} from "../../nodeflow-types";
import NodeConnector from "./NodeConnector";
import { NodeflowData, NodeflowNodeData } from "./index";
import Changes from "./Changes";
import NodeflowLib from "../NodeflowLib";

/**
 * Represents a section containing connectors on a node. Used for grouping connectors together.
 */
export default class ConnectorSection {
  private store;
  private readonly nodeflowData;

  constructor(nodeflowData: NodeflowData, data: ConnectorSectionType) {
    this.nodeflowData = nodeflowData;
    this.store = data;
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

  public static deserialize(
    data: Partial<SerializedConnectorSection>,
    node: NodeflowNodeData,
    hasHistoryGroup: string | boolean = true,
  ): ConnectorSection {
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    const sectionId =
      !data.id || node.connectorSections.has(data.id)
        ? node.getNextFreeConnectorSectionId()
        : data.id;

    const connectorSection = new ConnectorSection(node.nodeflow, {
      connectors: new Map<string, NodeConnector>(),
      css: data.css,
      id: sectionId,
      parentNode: node,
    });

    for (const [id, connectorData] of Object.entries(data.connectors ?? {})) {
      connectorSection.addConnector({ ...connectorData, id }, historyGroup);
    }

    return connectorSection;
  }

  /**
   * Adds a connector to the connector section
   *
   * @param data - The data of the connector to add
   * @param hasHistoryGroup - {string} - the history group to add the change to. {boolean} - whether to add the change to the history. Defaults to true.
   *
   * @returns The added connector
   */
  public addConnector(
    data: Partial<SerializedNodeConnector>,
    hasHistoryGroup: string | boolean = true,
  ): NodeConnector {
    const connector = NodeConnector.deserialize(data, this);

    if (this.connectors.has(connector.id)) {
      return this.connectors.get(connector.id)!;
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const serializedConnector = connector.serialize();
      const connectorSectionId = this.id;
      const connectorId = serializedConnector.id;
      const nodeId = this.parentNode.id;
      const nodeflowId = this.nodeflowData.id;

      this.nodeflowData.changes.addChange({
        type: "add",
        source: "connector",
        applyChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnector(connectorSectionId, serializedConnector, false);
        },
        undoChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnector(connectorSectionId, connectorId, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this.connectors.set(connector.id, connector);

    return connector;
  }

  /**
   * Removes a connector from the connector section
   *
   * @param connectorId - The id of the connector to remove
   * @param hasHistoryGroup - {string} - the history group to add the change to. {boolean} - whether to add the change to the history. Defaults to true.
   */
  public removeConnector(
    connectorId: string,
    hasHistoryGroup: string | boolean = true,
  ): void {
    if (!this.connectors.has(connectorId)) {
      return;
    }
    const connector = this.connectors.get(connectorId)!;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const serializedConnector = connector.serialize();
      const connectorSectionId = this.id;
      const connectorId = serializedConnector.id;
      const nodeId = this.parentNode.id;
      const nodeflowId = this.nodeflowData.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector",
        applyChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnector(connectorSectionId, connectorId, false);
        },
        undoChange: () => {
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnector(connectorSectionId, serializedConnector, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this.connectors.delete(connectorId);
  }

  public get connectors() {
    return this.store.connectors;
  }

  public get css() {
    return this.store.css;
  }

  public get id() {
    return this.store.id;
  }

  public get parentNode() {
    return this.store.parentNode;
  }

  public set connectors(value) {
    this.store.connectors = value;
  }

  public set css(value) {
    this.store.css = value;
  }

  public set id(value) {
    this.store.id = value;
  }

  public set parentNode(value) {
    this.store.parentNode = value;
  }

  public update(data: Partial<ConnectorSectionType>) {
    this.store = { ...this.store, ...data };
  }

  public updateWithPrevious(
    updater: (data: ConnectorSectionType) => Partial<ConnectorSectionType>,
  ) {
    this.update(updater(this.store));
  }

  /**
   * Removes all connections going into any of the connectors of the current connector section.
   */
  public removeIncomingConnections() {
    this.connectors.forEach((connector) =>
      connector.removeIncomingConnections(),
    );
  }

  /**
   * Removes all connections going out of the connectors of the current connector section.
   */
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
