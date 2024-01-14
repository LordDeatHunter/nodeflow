import setup from "../setup";
import { Vec2 } from "./Vec2";
import { createStore, produce } from "solid-js/store";
import {
  DeepPartial,
  DrawflowData,
  DrawflowNode as DrawflowNodeData,
  Optional,
} from "../../drawflow-types";
import { windowSize } from "../screen-utils";
import { clamp } from "../math-utils";
import {
  addConnection,
  Constants,
  getNextFreeNodeId,
} from "../drawflow-storage";
import { Changes } from "./Changes";
import MouseData from "./MouseData";
import { ReactiveMap } from "@solid-primitives/map";
import DrawflowNode from "./DrawflowNode";
import ConnectorSection from "./ConnectorSection";
import { drawflowEventStore } from "../events";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorSource from "./ConnectorSource";
import ConnectorDestination from "./ConnectorDestination";
import NodeConnector from "./NodeConnector";

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

  public center = () => {
    const windowDimensions = windowSize();
    const windowCenter = windowDimensions.divideBy(2);

    return this.position.negate().add(windowCenter);
  };

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
    data: Partial<DrawflowNodeData>,
    addToHistory = true,
  ): DrawflowNode {
    const id = data.id ?? getNextFreeNodeId();
    const newNode: Optional<DrawflowNode> = new DrawflowNode({
      centered: data.centered ?? false,
      connectorSections:
        data.connectorSections ?? new ReactiveMap<string, ConnectorSection>(),
      css: data.css ?? {},
      customData: data.customData ?? ({} as SolidDrawflow.CustomDataType),
      display: data.display ?? (() => undefined),
      id,
      offset: Vec2.zero(),
      position: data.position ?? Vec2.zero(),
      ref: undefined,
      size: Vec2.zero(),
    });
    this.nodes.set(id, newNode);

    if (addToHistory) {
      const oldConnections = this.getAllSourceConnections(id);

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          this.addNode(newNode.asObject(), false);
          oldConnections.forEach((connection) => {
            addConnection(
              connection.sourceNodeId,
              connection.sourceConnectorId,
              connection.destinationNodeId,
              connection.destinationConnectorId,
              connection.css,
              false,
            );
          });
        },
        undoChange: () => {
          this.removeNode(id, false);
        },
      });
    }

    return newNode;
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
      const oldConnections = this.getAllSourceConnections(nodeId);
      const applyChange = () => {
        this.updateNode(nodeId, data, false);
      };
      const undoChange = () => {
        this.updateNode(nodeId, oldNode.asObject(), false);
        oldConnections.forEach((connection) => {
          addConnection(
            connection.sourceNodeId,
            connection.sourceConnectorId,
            connection.destinationNodeId,
            connection.destinationConnectorId,
            connection.css,
            false,
          );
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
  removeNode(nodeId: string, addToHistory = true) {
    if (!this.nodes.has(nodeId)) return;

    this.mouseData.deselectNode();

    if (addToHistory) {
      const oldConnections = this.getAllSourceConnections(nodeId);
      const oldNode = this.nodes.get(nodeId)!;

      this.changes.addChange({
        type: "remove",
        source: "node",
        applyChange: () => {
          this.removeNode(nodeId, false);
        },
        undoChange: () => {
          this.addNode(oldNode, false);
          oldConnections.forEach((connection) => {
            addConnection(
              connection.sourceNodeId,
              connection.sourceConnectorId,
              connection.destinationNodeId,
              connection.destinationConnectorId,
              connection.css,
              false,
            );
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
    const node = this.nodes.get(nodeId)!;

    return Array.from(node.connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(
          Array.from(section.connectors.values()).flatMap((connector) =>
            connector.sources.flatMap((source) => source.sourceConnector),
          ),
        ),
      [] as NodeConnector[],
    );
  }

  public getAllDestinationConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }
    const node = this.nodes.get(nodeId)!;

    return Array.from(node.connectorSections.values()).reduce(
      (connectors, section) =>
        connectors.concat(
          Array.from(section.connectors.values()).flatMap((connector) =>
            connector.destinations.flatMap(
              (destination) => destination.destinationConnector,
            ),
          ),
        ),
      [] as NodeConnector[],
    );
  }

  public getAllSourceConnections(nodeId: string) {
    return this.getAllSourceConnectors(nodeId)
      .map((source) => {
        const filteredDestinations = source.destinations.filter(
          (destination) =>
            destination.destinationConnector.parentSection.parentNode.id ===
            nodeId,
        );
        return filteredDestinations.map((destination) => ({
          sourceNodeId: source.parentSection.parentNode.id,
          sourceConnectorId: source.id,
          destinationNodeId:
            destination.destinationConnector.parentSection.parentNode.id,
          destinationConnectorId: destination.destinationConnector.id,
          css: destination.css,
        }));
      })
      .flat();
  }

  public getAllDestinationConnections(nodeId: string) {
    return this.getAllDestinationConnectors(nodeId)
      .map((destination) => {
        const filteredSources = destination.sources.filter(
          (source) =>
            source.sourceConnector.parentSection.parentNode.id === nodeId,
        );
        return filteredSources.map((source) => ({
          sourceNodeId: source.sourceConnector.parentSection.parentNode.id,
          sourceConnectorId: source.sourceConnector.id,
          destinationNodeId: destination.parentSection.parentNode.id,
          destinationConnectorId: destination.id,
          css: source.sourceConnector.css,
        }));
      })
      .flat();
  }
}
