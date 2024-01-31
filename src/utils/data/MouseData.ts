import { createStore } from "solid-js/store";
import Vec2 from "./Vec2";
import { MouseDataType, SerializedMouseData } from "../../nodeflow-types";
import { NodeflowData } from "./index";

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
      heldConnection: undefined,
      heldConnectorId: undefined,
      heldNodeId: undefined,
      isDraggingObject: false,
      mousePosition: Vec2.zero(),
    });
  }

  public serialize(): SerializedMouseData {
    const heldConnection = this.heldConnection
      ? {
          sourceNodeId:
            this.heldConnection.sourceConnector.parentSection.parentNode.id,
          sourceConnectorId: this.heldConnection.sourceConnector.id,
          destinationNodeId:
            this.heldConnection.destinationConnector.parentSection.parentNode
              .id,
          destinationConnectorId: this.heldConnection.destinationConnector.id,
        }
      : undefined;

    return {
      clickStartPosition: this.clickStartPosition?.serialize(),
      heldConnection,
      heldConnectorId: this.heldConnectorId,
      heldNodeId: this.heldNodeId,
    };
  }

  public deserialize(serialized: SerializedMouseData) {
    let heldConnection;

    if (serialized.heldConnection) {
      const sourceConnector = this.nodeflowData.nodes
        .get(serialized.heldConnection.sourceNodeId)
        ?.getConnector(serialized.heldConnection.sourceConnectorId);
      const destinationConnector = this.nodeflowData.nodes
        .get(serialized.heldConnection.destinationNodeId)
        ?.getConnector(serialized.heldConnection.destinationConnectorId);

      if (sourceConnector && destinationConnector) {
        heldConnection = {
          sourceConnector,
          destinationConnector,
        };
      }
    }

    this.update({
      clickStartPosition: Vec2.deserializeOrDefault(
        serialized.clickStartPosition,
      ),
      heldConnection,
      heldConnectorId: serialized.heldConnectorId,
      heldNodeId: serialized.heldNodeId,
    });
  }

  get clickStartPosition() {
    return this.store[0].clickStartPosition;
  }

  get isDraggingObject() {
    return this.store[0].isDraggingObject;
  }

  get heldConnectorId() {
    return this.store[0].heldConnectorId;
  }

  get heldNodeId() {
    return this.store[0].heldNodeId;
  }

  get mousePosition() {
    return this.store[0].mousePosition;
  }

  get heldConnection() {
    return this.store[0].heldConnection;
  }

  set clickStartPosition(value) {
    this.store[1]({ clickStartPosition: value });
  }

  set isDraggingObject(value) {
    this.store[1]({ isDraggingObject: value });
  }

  set heldConnectorId(value) {
    this.store[1]({ heldConnectorId: value });
  }

  set heldNodeId(value) {
    this.store[1]({ heldNodeId: value });
  }

  set mousePosition(value) {
    this.store[1]({ mousePosition: value });
  }

  set heldConnection(value) {
    this.store[1]({ heldConnection: value });
  }

  public update(data: Partial<MouseDataType>) {
    this.store[1](data);
  }

  public updateWithPrevious(
    updater: (data: MouseDataType) => Partial<MouseDataType>,
  ) {
    this.store[1](updater);
  }

  public reset() {
    this.store[1]({
      isDraggingObject: false,
      heldConnection: undefined,
      heldConnectorId: undefined,
      heldNodeId: undefined,
    });
  }

  public selectNode = (nodeId: string, position: Vec2, dragging = true) => {
    this.update({
      isDraggingObject: dragging,
      heldConnectorId: undefined,
      heldConnection: undefined,
      heldNodeId: nodeId,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(this.nodeflowData.nodes.get(nodeId)!.position),
    });
  };

  /**
   * Deselects the currently selected node, connector and connection.
   */
  public deselectNode = () => {
    this.update({
      heldNodeId: undefined,
      heldConnectorId: undefined,
      heldConnection: undefined,
    });
    this.nodeflowData.resetMovement();
  };

  public startCreatingConnection = (
    nodeId: string,
    position: Vec2,
    outputId: string,
  ) => {
    if (!this.nodeflowData.settings.canCreateConnections) return;
    this.update({
      isDraggingObject: false,
      heldNodeId: nodeId,
      heldConnectorId: outputId,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(this.nodeflowData.zoomLevel)
        .subtract(this.nodeflowData.nodes.get(nodeId)!.position),
    });
  };

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
