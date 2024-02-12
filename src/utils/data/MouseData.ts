import { createStore } from "solid-js/store";
import Vec2 from "./Vec2";
import {
  MouseDataType,
  SelectableConnection,
  SelectableConnector,
  SelectableElement,
  SelectableNode,
  SerializedMouseData,
  SerializedSelectableElement,
} from "../../nodeflow-types";
import { NodeflowData } from "./index";
import ArrayWrapper from "./ArrayWrapper";

/**
 * Represents additional mouse data used in the nodeflow canvas, such held objects and mouse position.
 */
export default class MouseData {
  private readonly store;
  private readonly nodeflowData: NodeflowData;

  /**
   * @param nodeflowData - The nodeflow object of the canvas that this mouse data will be used in
   */
  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
    this.store = createStore<MouseDataType>({
      clickStartPosition: undefined,
      mousePosition: Vec2.zero(),
      pointerDown: false,
      selections: new ArrayWrapper<SelectableElement>(),
    });
  }

  public serialize(): SerializedMouseData {
    const serializedSelections: SerializedSelectableElement[] =
      this.store[0].selections.map((selection) => {
        switch (selection.type) {
          case "connector":
            return {
              connectorId: selection.connector.id,
              nodeId: selection.connector.parentNode.id,
              type: "connector",
            };
          case "node":
            return {
              nodeId: selection.node.id,
              type: "node",
            };
          case "connection":
            return {
              connection: {
                destinationConnectorId:
                  selection.connection.destinationConnector.id,
                destinationNodeId:
                  selection.connection.destinationConnector.parentSection
                    .parentNode.id,
                sourceConnectorId: selection.connection.sourceConnector.id,
                sourceNodeId:
                  selection.connection.sourceConnector.parentNode.id,
              },
              type: "connection",
            };
          default:
            return {
              type: "nodeflow",
            };
        }
      });

    return {
      clickStartPosition: this.clickStartPosition?.serialize(),
      selections: serializedSelections,
    };
  }

  public deserialize(serialized: SerializedMouseData) {
    const selections = serialized.selections
      .map((selection) => {
        if (selection.type === "connector") {
          const node = this.nodeflowData.nodes.get(selection.nodeId);
          if (!node) return;
          const connector = node.getConnector(selection.connectorId);
          if (!connector) return;
          return { connector, type: "connector" };
        } else if (selection.type === "node") {
          const nodeData = this.nodeflowData.nodes.get(selection.nodeId);
          if (!nodeData) return;
          return { node: nodeData, type: "node" };
        } else if (selection.type === "connection") {
          const sourceNode = this.nodeflowData.nodes.get(
            selection.connection.sourceNodeId,
          );
          if (!sourceNode) return;
          const sourceConnector = sourceNode.getConnector(
            selection.connection.sourceConnectorId,
          );
          if (!sourceConnector) return;
          const destinationNode = this.nodeflowData.nodes.get(
            selection.connection.destinationNodeId,
          );
          if (!destinationNode) return;
          const destinationConnector = destinationNode.getConnector(
            selection.connection.destinationConnectorId,
          );
          if (!destinationConnector) return;
          return {
            connection: {
              destinationConnector,
              sourceConnector,
            },
            type: "connection",
          };
        } else {
          return { type: "nodeflow" };
        }
      })
      .filter(Boolean) as SelectableElement[];

    this.update({
      clickStartPosition: Vec2.deserializeOrDefault(
        serialized.clickStartPosition,
      ),
      selections: new ArrayWrapper<SelectableElement>(selections),
    });
  }

  get clickStartPosition() {
    return this.store[0].clickStartPosition;
  }

  get isDraggingObject() {
    return this.store[0].pointerDown;
  }

  get selections() {
    return this.store[0].selections;
  }

  get heldConnections(): Array<SelectableConnection> {
    return this.store[0].selections.filter(
      (selection) => selection.type === "connection",
    ) as Array<SelectableConnection>;
  }

  get heldConnectors(): Array<SelectableConnector> {
    return this.store[0].selections.filter(
      (selection) => selection.type === "connector",
    ) as Array<SelectableConnector>;
  }

  get heldNodes(): Array<SelectableNode> {
    return this.store[0].selections.filter(
      (selection) => selection.type === "node",
    ) as Array<SelectableNode>;
  }

  get mousePosition() {
    return this.store[0].mousePosition;
  }

  get pointerDown() {
    return this.store[0].pointerDown;
  }

  set clickStartPosition(value) {
    this.store[1]({ clickStartPosition: value });
  }

  set mousePosition(value) {
    this.store[1]({ mousePosition: value });
  }

  set pointerDown(value: boolean) {
    this.store[1]({ pointerDown: value });
  }

  public update(data: Partial<MouseDataType>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: MouseDataType) => Partial<MouseDataType>,
  ) {
    this.store[1](updater);
  }

  public reset(pointerDown = false) {
    this.update({
      clickStartPosition: undefined,
      pointerDown,
      selections: new ArrayWrapper<SelectableElement>(),
    });
  }

  public selectNodeflow() {
    if (this.hasSelectedNodeflow()) {
      this.selections.filterInPlace(
        (selection) => selection.type !== "nodeflow",
      );
    }

    this.selections.push({ type: "nodeflow" });
  }

  public selectNode = (nodeId: string, position: Vec2, dragging = true) => {
    if (!this.nodeflowData.nodes.has(nodeId)) return;
    const node = this.nodeflowData.nodes.get(nodeId)!;

    if (this.hasSelectedNode(nodeId)) {
      this.selections.filterInPlace(
        (selection) =>
          selection.type !== "node" || selection.node.id !== nodeId,
      );
    }

    this.selections.push({
      node,
      type: "node",
    });

    this.update({
      pointerDown: dragging,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(this.nodeflowData.nodes.get(nodeId)!.position),
    });
  };

  /**
   * Deselects the currently selected node, connector and connection.
   */
  public clearSelections = () => {
    this.store[1]("selections", new ArrayWrapper<SelectableElement>());
    this.nodeflowData.resetMovement();
  };

  public startCreatingConnection = (
    nodeId: string,
    position: Vec2,
    outputId: string,
  ) => {
    if (!this.nodeflowData.settings.canCreateConnections) return;

    const node = this.nodeflowData.nodes.get(nodeId);
    if (!node) return;

    const connector = node.getConnector(outputId);
    if (!connector) return;

    this.update({
      pointerDown: true,
      selections: new ArrayWrapper<SelectableElement>([
        { connector, type: "connector" },
      ]),
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(node.position),
    });
  };

  public clearSelectedByType(type: SelectableElement["type"]) {
    this.store[0].selections.filterInPlace(
      (selection) => selection.type !== type,
    );
  }

  public hasSelectedNodeflow() {
    return this.store[0].selections.some(
      (selection) => selection.type === "nodeflow",
    );
  }

  public hasSelectedNode(nodeId: string) {
    return this.store[0].selections.some(
      (selection) => selection.type === "node" && selection.node.id === nodeId,
    );
  }

  public hasSelectedConnector(connectorId: string) {
    return this.store[0].selections.some(
      (selection) =>
        selection.type === "connector" &&
        selection.connector.id === connectorId,
    );
  }

  public hasSelectedConnection(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
  ) {
    return this.store[0].selections.some(
      (selection) =>
        selection.type === "connection" &&
        selection.connection.sourceConnector.id === sourceConnectorId &&
        selection.connection.sourceConnector.parentNode.id === sourceNodeId &&
        selection.connection.destinationConnector.id ===
          destinationConnectorId &&
        selection.connection.destinationConnector.parentNode.id ===
          destinationNodeId,
    );
  }

  /**
   * Calculates the global mouse position, relative to the canvas.
   *
   * 1. Subtracts the starting position of the canvas from the mouse position, this makes the cursor relative to the start of the canvas
   * 2. Divides by the zoom level, this zooms the working area to the relevant size
   * 3. Subtracts the canvas offset to get the final position
   */
  public globalMousePosition = () =>
    this.mousePosition
      .subtract(this.nodeflowData.startPosition)
      .divideBy(this.nodeflowData.zoomLevel)
      .subtract(this.nodeflowData.position);
}
