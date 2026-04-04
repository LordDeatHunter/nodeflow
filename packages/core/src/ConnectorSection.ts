import { ConnectorSectionType } from "./types";
import {
  SerializedConnectorSection,
  SerializedNodeConnector,
} from "./nodeflow-types";
import NodeConnector from "./NodeConnector";
import Changes from "./Changes";

/**
 * Represents a section containing connectors on a node. Used for grouping connectors together.
 */
export default class ConnectorSection {
  private _connectors: Map<string, NodeConnector> = new Map();
  private _css?: string;
  private _id: string;
  private readonly _parentNode: any;
  private readonly nodeflowData: any;

  constructor(nodeflowData: any, data: ConnectorSectionType) {
    this.nodeflowData = nodeflowData;
    this._id = data.id;
    this._css = data.css;
    this._parentNode = data.parentNode;
    if (data.connectors instanceof Map) {
      this._connectors = data.connectors as Map<string, NodeConnector>;
    }
  }

  public serialize(): SerializedConnectorSection {
    return {
      connectors: Object.fromEntries(
        Array.from(this._connectors.entries()).map(([id, connector]) => [
          id,
          connector.serialize(),
        ]),
      ),
      css: this._css,
      id: this._id,
    };
  }

  public static deserialize(
    data: Partial<SerializedConnectorSection>,
    node: any,
    hasHistoryGroup: string | boolean = true,
  ): ConnectorSection {
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    const sectionId =
      !data.id || node.connectorSections.has(data.id)
        ? node.getNextFreeConnectorSectionId()
        : data.id;

    const connectorSection = new ConnectorSection(node.nodeflow, {
      connectors: new Map(),
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

    if (this._connectors.has(connector.id)) {
      return this._connectors.get(connector.id)!;
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const serializedConnector = connector.serialize();
      const connectorSectionId = this._id;
      const connectorId = serializedConnector.id;
      const nodeId = this._parentNode.id;
      const nodeflowId = this.nodeflowData.id;

      this.nodeflowData.changes.addChange({
        type: "add",
        source: "connector",
        applyChange: () => {
          (this.nodeflowData as any)
            ?.getNodeflow?.(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnector(connectorSectionId, serializedConnector, false);
        },
        undoChange: () => {
          (this.nodeflowData as any)
            ?.getNodeflow?.(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnector(connectorSectionId, connectorId, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this._connectors.set(connector.id, connector);

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
    if (!this._connectors.has(connectorId)) {
      return;
    }
    const connector = this._connectors.get(connectorId)!;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const serializedConnector = connector.serialize();
      const connectorSectionId = this._id;
      const removedConnectorId = serializedConnector.id;
      const nodeId = this._parentNode.id;
      const nodeflowId = this.nodeflowData.id;

      this.nodeflowData.changes.addChange({
        type: "remove",
        source: "connector",
        applyChange: () => {
          (this.nodeflowData as any)
            ?.getNodeflow?.(nodeflowId)
            ?.nodes.get(nodeId)
            ?.removeConnector(connectorSectionId, removedConnectorId, false);
        },
        undoChange: () => {
          (this.nodeflowData as any)
            ?.getNodeflow?.(nodeflowId)
            ?.nodes.get(nodeId)
            ?.addConnector(connectorSectionId, serializedConnector, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    this._connectors.delete(connectorId);
  }

  public get connectors(): Map<string, NodeConnector> {
    return this._connectors;
  }

  public set connectors(value: Map<string, NodeConnector>) {
    this._connectors = value;
  }

  public get css(): string | undefined {
    return this._css;
  }

  public set css(value: string | undefined) {
    this._css = value;
  }

  public get id(): string {
    return this._id;
  }

  public set id(value: string) {
    this._id = value;
  }

  public get parentNode(): any {
    return this._parentNode;
  }

  public set parentNode(value: any) {
    (this as any)._parentNode = value;
  }

  public update(data: Partial<ConnectorSectionType>) {
    if (data.connectors !== undefined)
      this._connectors = data.connectors as Map<string, NodeConnector>;
    if (data.css !== undefined) this._css = data.css;
    if (data.id !== undefined) this._id = data.id;
  }

  public updateWithPrevious(
    updater: (data: ConnectorSectionType) => Partial<ConnectorSectionType>,
  ) {
    const result = updater({
      connectors: this._connectors,
      css: this._css,
      id: this._id,
      parentNode: this._parentNode,
    });
    this.update(result);
  }

  /**
   * Removes all connections going into any of the connectors of the current connector section.
   */
  public removeIncomingConnections() {
    this._connectors.forEach((connector) =>
      connector.removeIncomingConnections(),
    );
  }

  /**
   * Removes all connections going out of the connectors of the current connector section.
   */
  public removeOutgoingConnections() {
    this._connectors.forEach((connector) =>
      connector.removeOutgoingConnections(),
    );
  }

  public getSourceConnectors(): NodeConnector[] {
    return Array.from(this._connectors.values()).flatMap((connector) =>
      connector.sources.flatMap((source) => source.sourceConnector),
    );
  }

  public getDestinationConnectors(): NodeConnector[] {
    return Array.from(this._connectors.values()).flatMap((connector) =>
      connector.destinations.flatMap(
        (destination) => destination.destinationConnector,
      ),
    );
  }
}
