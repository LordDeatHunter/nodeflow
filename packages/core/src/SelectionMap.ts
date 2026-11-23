import {
  SelectableElementType,
  SerializedSelectableElement,
} from "./nodeflow-types";
import { SelectableConnection, SelectableElement } from "./types";

export default class SelectionMap {
  private readonly connectorsMap = new Map<string, any>();
  private readonly nodesMap = new Map<string, any>();
  private readonly connectionsMap = new Map<string, SelectableConnection>();
  private readonly nodeflowData: any;
  private _hasSelectedNodeflow: boolean = false;

  public constructor(nodeflowData: any) {
    this.nodeflowData = nodeflowData;
  }

  public static createHash(selectableElement: SelectableElement) {
    switch (selectableElement.type) {
      case SelectableElementType.Connector:
        return `${selectableElement.connector.parentNode.id}-${selectableElement.connector.id}`;
      case SelectableElementType.Node:
        return `${selectableElement.node.id}`;
      case SelectableElementType.Connection:
        return `${selectableElement.connection.sourceConnector.parentNode.id}-${selectableElement.connection.sourceConnector.id}-${selectableElement.connection.destinationConnector.parentNode.id}-${selectableElement.connection.destinationConnector.id}`;
      default:
        return SelectableElementType.Nodeflow;
    }
  }

  public addNode(node: any) {
    const hash = SelectionMap.createHash({
      node,
      type: SelectableElementType.Node,
    });
    this.nodesMap.set(hash, node);
    this.nodeflowData.publishContentChanged();
    return this.nodesMap;
  }

  public addConnector(connector: any) {
    const hash = SelectionMap.createHash({
      connector,
      type: SelectableElementType.Connector,
    });
    this.connectorsMap.set(hash, connector);
    this.nodeflowData.publishContentChanged();
    return this.connectorsMap;
  }

  public addConnection(connection: SelectableConnection) {
    const hash = SelectionMap.createHash(connection);
    this.connectionsMap.set(hash, connection);
    this.nodeflowData.publishContentChanged();
    return this.connectionsMap;
  }

  public addNodeflow() {
    this._hasSelectedNodeflow = true;
    this.nodeflowData.publishContentChanged();
    return this;
  }

  public add(value: SelectableElement) {
    switch (value.type) {
      case SelectableElementType.Connector:
        return this.addConnector(value.connector);
      case SelectableElementType.Node:
        return this.addNode(value.node);
      case SelectableElementType.Connection:
        return this.addConnection(value);
      default:
        return this.addNodeflow();
    }
  }

  public delete(value: SelectableElement) {
    const result = this.deleteElement(value);
    this.nodeflowData.publishContentChanged();
    return result;
  }

  private deleteElement(value: SelectableElement) {
    const hash = SelectionMap.createHash(value);
    switch (value.type) {
      case SelectableElementType.Connector:
        return this.connectorsMap.delete(hash);
      case SelectableElementType.Node:
        return this.nodesMap.delete(hash);
      case SelectableElementType.Connection:
        return this.connectionsMap.delete(hash);
      default:
        this._hasSelectedNodeflow = false;
        return this;
    }
  }

  public has(value: SelectableElement) {
    const hash = SelectionMap.createHash(value);
    switch (value.type) {
      case SelectableElementType.Connector:
        return this.connectorsMap.has(hash);
      case SelectableElementType.Node:
        return this.nodesMap.has(hash);
      case SelectableElementType.Connection:
        return this.connectionsMap.has(hash);
      default:
        return this._hasSelectedNodeflow;
    }
  }

  public get(value: SelectableElement) {
    const hash = SelectionMap.createHash(value);
    switch (value.type) {
      case SelectableElementType.Connector:
        return this.connectorsMap.get(hash);
      case SelectableElementType.Node:
        return this.nodesMap.get(hash);
      case SelectableElementType.Connection:
        return this.connectionsMap.get(hash);
      default:
        return this.nodeflowData;
    }
  }

  public static serialize(
    element: SelectableElement,
  ): SerializedSelectableElement {
    switch (element.type) {
      case SelectableElementType.Connector:
        return {
          connectorId: element.connector.id,
          nodeId: element.connector.parentNode.id,
          type: SelectableElementType.Connector,
        };
      case SelectableElementType.Node:
        return {
          nodeId: element.node.id,
          type: SelectableElementType.Node,
        };
      case SelectableElementType.Connection:
        return {
          connection: {
            destinationConnectorId: element.connection.destinationConnector.id,
            destinationNodeId:
              element.connection.destinationConnector.parentSection.parentNode
                .id,
            sourceConnectorId: element.connection.sourceConnector.id,
            sourceNodeId: element.connection.sourceConnector.parentNode.id,
          },
          type: SelectableElementType.Connection,
        };
      default:
        return { type: SelectableElementType.Nodeflow };
    }
  }

  public static deserialize(
    element: SerializedSelectableElement,
    nodeflowData: any,
  ): SelectableElement {
    switch (element.type) {
      case SelectableElementType.Connector: {
        const node = nodeflowData.nodes.get(element.nodeId);
        if (!node) throw new Error("Node not found");
        const connector = node.getConnector(element.connectorId);
        if (!connector) throw new Error("Connector not found");
        return { connector, type: SelectableElementType.Connector };
      }
      case SelectableElementType.Node: {
        const nodeData = nodeflowData.nodes.get(element.nodeId);
        if (!nodeData) throw new Error("Node not found");
        return { node: nodeData, type: SelectableElementType.Node };
      }
      case SelectableElementType.Connection: {
        const sourceNode = nodeflowData.nodes.get(
          element.connection.sourceNodeId,
        );
        if (!sourceNode) throw new Error("Source node not found");
        const sourceConnector = sourceNode.getConnector(
          element.connection.sourceConnectorId,
        );
        if (!sourceConnector) throw new Error("Source connector not found");
        const destinationNode = nodeflowData.nodes.get(
          element.connection.destinationNodeId,
        );
        if (!destinationNode) throw new Error("Destination node not found");
        const destinationConnector = destinationNode.getConnector(
          element.connection.destinationConnectorId,
        );
        if (!destinationConnector)
          throw new Error("Destination connector not found");
        return {
          connection: {
            destinationConnector,
            sourceConnector,
          },
          type: SelectableElementType.Connection,
        };
      }
      default:
        return { type: SelectableElementType.Nodeflow };
    }
  }

  public toObject(): Record<string, SerializedSelectableElement> {
    const obj: Record<string, SerializedSelectableElement> = {};
    this.connectorsMap.forEach((value) => {
      obj[
        SelectionMap.createHash({
          connector: value,
          type: SelectableElementType.Connector,
        })
      ] = SelectionMap.serialize({
        connector: value,
        type: SelectableElementType.Connector,
      });
    });
    this.nodesMap.forEach((value) => {
      obj[
        SelectionMap.createHash({
          node: value,
          type: SelectableElementType.Node,
        })
      ] = SelectionMap.serialize({
        node: value,
        type: SelectableElementType.Node,
      });
    });
    this.connectionsMap.forEach((value) => {
      obj[SelectionMap.createHash(value)] = SelectionMap.serialize(value);
    });
    if (this._hasSelectedNodeflow) {
      obj[SelectableElementType.Nodeflow] = {
        type: SelectableElementType.Nodeflow,
      };
    }
    return obj;
  }

  public static fromObject(
    obj: Record<string, SerializedSelectableElement>,
    nodeflowData: any,
  ): SelectionMap {
    const selectionMap = new SelectionMap(nodeflowData);
    for (const key in obj) {
      const value = obj[key];
      switch (value.type) {
        case SelectableElementType.Connector:
        case SelectableElementType.Node:
        case SelectableElementType.Connection:
          selectionMap.add(SelectionMap.deserialize(value, nodeflowData));
          break;
        default:
          selectionMap._hasSelectedNodeflow = true;
          break;
      }
    }
    return selectionMap;
  }

  public get selectedConnectors(): any[] {
    return Array.from(this.connectorsMap.values());
  }

  public get selectedNodes(): any[] {
    return Array.from(this.nodesMap.values());
  }

  public get selectedNodesMap(): Map<string, any> {
    return this.nodesMap;
  }

  public get selectedConnections(): SelectableConnection[] {
    return Array.from(this.connectionsMap.values());
  }

  public get selectedNodeflow(): boolean {
    return this._hasSelectedNodeflow;
  }

  public hasSelectedNodeflow(): boolean {
    return this._hasSelectedNodeflow;
  }

  public clearConnectors() {
    this.connectorsMap.clear();
    this.nodeflowData.publishContentChanged();
  }

  public clearNodes() {
    this.nodesMap.clear();
    this.nodeflowData.publishContentChanged();
  }

  public clearConnections() {
    this.connectionsMap.clear();
    this.nodeflowData.publishContentChanged();
  }

  public clearNodeflow() {
    this._hasSelectedNodeflow = false;
    this.nodeflowData.publishContentChanged();
  }

  public clear() {
    this.connectorsMap.clear();
    this.nodesMap.clear();
    this.connectionsMap.clear();
    this._hasSelectedNodeflow = false;
    this.nodeflowData.publishContentChanged();
  }

  public isNodeSelected(nodeId: string): boolean {
    return this.nodesMap.has(nodeId);
  }

  public isConnectorSelected(connectorId: string, nodeId: string): boolean {
    return this.connectorsMap.has(`${nodeId}-${connectorId}`);
  }

  public isConnectionSelected(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
  ): boolean {
    return this.connectionsMap.has(
      `${sourceNodeId}-${sourceConnectorId}-${destinationNodeId}-${destinationConnectorId}`,
    );
  }

  public deleteNodes(predicate: (node: any) => boolean) {
    for (const node of this.nodesMap.values()) {
      if (predicate(node)) {
        this.nodesMap.delete(node.id);
      }
    }
    this.nodeflowData.publishContentChanged();
  }

  public deleteConnectors(predicate: (connector: any) => boolean) {
    for (const connector of this.connectorsMap.values()) {
      if (predicate(connector)) {
        this.connectorsMap.delete(`${connector.parentNode.id}-${connector.id}`);
      }
    }
    this.nodeflowData.publishContentChanged();
  }

  public deleteConnections(
    predicate: (connection: SelectableConnection) => boolean,
  ) {
    for (const connection of this.connectionsMap.values()) {
      if (predicate(connection)) {
        this.connectionsMap.delete(
          `${connection.connection.sourceConnector.parentNode.id}-${connection.connection.sourceConnector.id}-${connection.connection.destinationConnector.parentNode.id}-${connection.connection.destinationConnector.id}`,
        );
      }
    }
    this.nodeflowData.publishContentChanged();
  }

  public get size() {
    return (
      this.connectorsMap.size +
      this.nodesMap.size +
      this.connectionsMap.size +
      (this._hasSelectedNodeflow ? 1 : 0)
    );
  }
}
