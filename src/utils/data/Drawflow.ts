import setup from "../setup";
import Vec2 from "./Vec2";
import { createStore, produce } from "solid-js/store";
import {
  DeepPartial,
  DrawflowData,
  DrawflowNode as DrawflowNodeData,
  SerializedConnection,
  SerializedDrawflow,
  SerializedDrawflowNode,
} from "../../drawflow-types";
import { windowSize } from "../screen-utils";
import { clamp } from "../math-utils";
import { addConnection, Constants } from "../drawflow-storage";
import { Changes } from "./Changes";
import MouseData from "./MouseData";
import { ReactiveMap } from "@solid-primitives/map";
import DrawflowNode from "./DrawflowNode";
import { drawflowEventStore } from "../events";
import NodeConnector from "./NodeConnector";
import ConnectorSource from "./ConnectorSource";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorDestination from "./ConnectorDestination";

export default class Drawflow {
  private readonly store;
  public readonly changes;
  public readonly mouseData;
  public readonly nodes;

  constructor() {
    this.store = createStore<DrawflowData>({
      currentMoveSpeed: Vec2.zero(),
      position: Vec2.zero(),
      startPosition: Vec2.zero(),
      size: Vec2.zero(),
      zoomLevel: 1,
      pinchDistance: 0,
    });

    this.changes = new Changes();
    this.mouseData = new MouseData();
    this.nodes = new ReactiveMap<string, DrawflowNode>();

    setup();
  }

  public serialize(): SerializedDrawflow {
    return {
      changes: this.changes.serialize(),
      connections: this.serializeConnections(),
      currentMoveSpeed: this.currentMoveSpeed.serialize(),
      mouseData: this.mouseData.serialize(),
      nodes: Object.fromEntries(
        Array.from(this.nodes.entries()).map(([id, node]) => [
          id,
          node.serialize(),
        ]),
      ),
      pinchDistance: this.pinchDistance,
      position: this.position.serialize(),
      size: this.size.serialize(),
      startPosition: this.startPosition.serialize(),
      zoomLevel: this.zoomLevel,
    };
  }

  public deserialize(data: SerializedDrawflow) {
    this.update({
      currentMoveSpeed: Vec2.deserializeOrDefault(data.currentMoveSpeed),
      pinchDistance: data.pinchDistance,
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.deserializeOrDefault(data.size),
      startPosition: Vec2.deserializeOrDefault(data.startPosition),
      zoomLevel: data.zoomLevel,
    });

    this.nodes.clear();
    Object.entries(data.nodes).forEach(([_, node]) => {
      this.addNode(node, false);
    });

    this.mouseData.deserialize(data.mouseData);

    data.connections.forEach((connection) => {
      addConnection(connection, false);
    });

    this.changes.deserialize(data.changes);
  }

  public serializeConnections(): Array<SerializedConnection> {
    return Array.from(this.nodes.values()).flatMap((node) =>
      node.serializeConnections(),
    );
  }

  get currentMoveSpeed() {
    return this.store[0].currentMoveSpeed;
  }

  get position() {
    return this.store[0].position;
  }

  get startPosition() {
    return this.store[0].startPosition;
  }

  get size() {
    return this.store[0].size;
  }

  get zoomLevel() {
    return this.store[0].zoomLevel;
  }

  get pinchDistance() {
    return this.store[0].pinchDistance;
  }

  set currentMoveSpeed(value) {
    this.store[1]({ currentMoveSpeed: value });
  }

  set position(value) {
    this.store[1]({ position: value });
  }

  set startPosition(value) {
    this.store[1]({ startPosition: value });
  }

  set size(value) {
    this.store[1]({ size: value });
  }

  set zoomLevel(value) {
    this.store[1]({ zoomLevel: value });
  }

  set pinchDistance(value) {
    this.store[1]({ pinchDistance: value });
  }

  public update(data: Partial<DrawflowData>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: DrawflowData) => Partial<DrawflowData>,
  ) {
    this.store[1](updater);
  }

  public center() {
    const windowDimensions = windowSize();
    const windowCenter = windowDimensions.divideBy(2);

    return this.startPosition
      .add(windowCenter)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }

  public updateZoom = (distance: number, location: Vec2) => {
    const oldZoom = this.zoomLevel;

    if (distance === 0) return;

    const newZoom = Number(
      clamp(
        distance > 0
          ? oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER
          : oldZoom / (1 - distance * Constants.ZOOM_MULTIPLIER),
        Constants.MIN_ZOOM,
        Constants.MAX_ZOOM,
      ).toFixed(4),
    );

    this.mouseData.isDraggingNode = false;

    const windowDimensions = this.size;
    const centeredZoomLocation = location.subtract(this.startPosition);

    const oldScreenSize = windowDimensions.multiplyBy(oldZoom);
    const newScreenSize = windowDimensions.multiplyBy(newZoom);
    const oldOffset = centeredZoomLocation
      .subtract(oldScreenSize.divideBy(2))
      .divideBy(oldZoom);

    const newOffset = centeredZoomLocation
      .subtract(newScreenSize.divideBy(2))
      .divideBy(newZoom);

    this.updateWithPrevious((prev) => ({
      position: prev.position.subtract(oldOffset).add(newOffset),
      zoomLevel: newZoom,
    }));
  };

  public updateBackgroundPosition(moveDistance: Vec2, keyboard = false) {
    if (
      this.mouseData.heldNodeId ||
      keyboard === this.mouseData.isDraggingNode
    ) {
      return;
    }

    this.updateWithPrevious((prev) => ({
      position: prev.position.add(moveDistance.divideBy(this.zoomLevel)),
    }));
  }

  public addNode(
    data: Partial<SerializedDrawflowNode>,
    addToHistory = true,
  ): DrawflowNode {
    const node = DrawflowNode.deserialize(data);

    this.nodes.set(node.id, node);

    if (addToHistory) {
      const oldConnections = node.serializeConnections();

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          this.addNode(node.serialize(), false);

          oldConnections.forEach((connection) => {
            addConnection(connection, false);
          });
        },
        undoChange: () => {
          this.removeNode(node.id, false);
        },
      });
    }

    return node;
  }

  public updateNode(
    nodeId: string,
    data: DeepPartial<DrawflowNodeData>,
    addToHistory = true,
  ) {
    if (!this.nodes.has(nodeId)) return;

    const node = this.nodes.get(nodeId)!;

    if (addToHistory) {
      const oldNode = this.nodes.get(nodeId)!;
      const oldConnections = oldNode.serializeConnections();

      const applyChange = () => {
        this.updateNode(nodeId, data, false);
      };

      const undoChange = () => {
        this.updateNode(nodeId, oldNode, false);
        oldConnections.forEach((connection) => {
          addConnection(connection, false);
        });
      };
      this.changes.addChange({
        type: "update",
        source: "node",
        applyChange,
        undoChange,
      });
    }

    drawflowEventStore.onNodeDataChanged.publish({ nodeId, data });

    node.updateWithPrevious(produce((prev) => Object.assign(prev, data)));
  }

  /**
   * Removes a node and all connections to and from it
   * @param nodeId - the id of the node to remove
   * @param addToHistory - whether to add this change to the history
   */
  public removeNode(nodeId: string, addToHistory = true) {
    if (!this.nodes.has(nodeId)) return;

    this.mouseData.deselectNode();

    if (addToHistory) {
      const oldNode = this.nodes.get(nodeId)!;
      const oldConnections = oldNode.serializeConnections();

      this.changes.addChange({
        type: "remove",
        source: "node",

        applyChange: () => {
          this.removeNode(nodeId, false);
        },

        undoChange: () => {
          this.addNode(oldNode.serialize(), false);

          oldConnections.forEach((connection) => {
            addConnection(connection, false);
          });
        },
      });
    }

    this.removeIncomingConnections(nodeId);
    this.removeOutgoingConnections(nodeId);

    this.nodes.delete(nodeId);
  }

  public removeIncomingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.sources.forEach(({ sourceConnector }) => {
          sourceConnector.destinations.filterInPlace(
            ({ destinationConnector }) =>
              destinationConnector.parentSection.parentNode.id !== nodeId,
          );
        });
        connector.sources = new ArrayWrapper<ConnectorSource>([]);
      });
    });
  }

  public removeOutgoingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.destinations.forEach(({ destinationConnector }) => {
          destinationConnector.sources.filterInPlace(
            ({ sourceConnector }) =>
              sourceConnector.parentSection.parentNode.id !== nodeId,
          );
        });
        connector.destinations = new ArrayWrapper<ConnectorDestination>([]);
      });
    });
  }

  public getAllSourceConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnectors();
  }

  public getAllDestinationConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnectors();
  }

  public getAllSourceConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnections();
  }

  public getAllDestinationConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnections();
  }

  public getNextFreeNodeId(): string {
    let newId = "0";

    for (let i = 1; this.nodes.has(newId); ++i) {
      newId = i.toString();
    }

    return newId;
  }
}
