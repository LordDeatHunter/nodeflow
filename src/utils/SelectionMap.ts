import {
  SelectableConnection,
  SelectableElement,
  SelectableElementType,
  SerializedSelectableElement,
} from "../nodeflow-types";
import { NodeConnector, NodeflowData, NodeflowNodeData } from "./data";
import { ReactiveMap } from "@solid-primitives/map";

export default class SelectionMap {
  private readonly connectorsMap = new ReactiveMap<string, NodeConnector>();
  private readonly nodesMap = new ReactiveMap<string, NodeflowNodeData>();
  private readonly connectionsMap = new ReactiveMap<
    string,
    SelectableConnection
  >();
  private readonly nodeflowData: NodeflowData;
  private _hasSelectedNodeflow: boolean = false;

  public constructor(nodeflowData: NodeflowData) {
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

  public addNode(node: NodeflowNodeData) {
    const hash = SelectionMap.createHash({
      node,
      type: SelectableElementType.Node,
    });
    return this.nodesMap.set(hash, node);
  }

  public addConnector(connector: NodeConnector) {
    const hash = SelectionMap.createHash({
      connector,
      type: SelectableElementType.Connector,
    });
    return this.connectorsMap.set(hash, connector);
  }

  public addConnection(connection: SelectableConnection) {
    const hash = SelectionMap.createHash(connection);
    return this.connectionsMap.set(hash, connection);
  }

  public addNodeflow() {
    this._hasSelectedNodeflow = true;
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
    nodeflowData: NodeflowData,
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
    nodeflowData: NodeflowData,
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

  public get selectedConnectors(): NodeConnector[] {
    return Array.from(this.connectorsMap.values());
  }

  public get selectedNodes(): NodeflowNodeData[] {
    return Array.from(this.nodesMap.values());
  }

  public get selectedNodesMap(): ReactiveMap<string, NodeflowNodeData> {
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
  }

  public clearNodes() {
    this.nodesMap.clear();
  }

  public clearConnections() {
    this.connectionsMap.clear();
  }

  public clearNodeflow() {
    this._hasSelectedNodeflow = false;
  }

  public clear() {
    this.clearConnectors();
    this.clearNodes();
    this.clearConnections();
    this.clearNodeflow();
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

  public deleteNodes(predicate: (node: NodeflowNodeData) => boolean) {
    for (const node of this.nodesMap.values()) {
      if (predicate(node)) {
        this.nodesMap.delete(node.id);
      }
    }
  }

  public deleteConnectors(predicate: (connector: NodeConnector) => boolean) {
    for (const connector of this.connectorsMap.values()) {
      if (predicate(connector)) {
        this.connectorsMap.delete(`${connector.parentNode.id}-${connector.id}`);
      }
    }
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
