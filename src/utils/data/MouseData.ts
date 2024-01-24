import { createStore } from "solid-js/store";
import Vec2 from "./Vec2";
import { MouseDataType, SerializedMouseData } from "../../drawflow-types";
import { drawflow, resetMovement } from "../drawflow-storage";

export default class MouseData {
  private readonly store;

  public constructor() {
    this.store = createStore<MouseDataType>({
      clickStartPosition: undefined,
      heldConnection: undefined,
      heldConnectorId: undefined,
      heldNodeId: undefined,
      isDraggingNode: false,
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
      const sourceConnector = drawflow.nodes
        .get(serialized.heldConnection.sourceNodeId)
        ?.getConnector(serialized.heldConnection.sourceConnectorId);
      const destinationConnector = drawflow.nodes
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

  get isDraggingNode() {
    return this.store[0].isDraggingNode;
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

  set isDraggingNode(value) {
    this.store[1]({ isDraggingNode: value });
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
      isDraggingNode: false,
      heldConnection: undefined,
      heldConnectorId: undefined,
      heldNodeId: undefined,
    });
  }

  public selectNode = (nodeId: string, position: Vec2, dragging = true) => {
    this.update({
      isDraggingNode: dragging,
      heldConnectorId: undefined,
      heldConnection: undefined,
      heldNodeId: nodeId,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(drawflow.zoomLevel)
        .subtract(drawflow.nodes.get(nodeId)!.position),
    });
  };

  public deselectNode = () => {
    this.update({
      heldNodeId: undefined,
      heldConnectorId: undefined,
      heldConnection: undefined,
    });
    resetMovement();
  };

  public startCreatingConnection = (
    nodeId: string,
    position: Vec2,
    outputId: string,
  ) => {
    this.update({
      isDraggingNode: false,
      heldNodeId: nodeId,
      heldConnectorId: outputId,
      mousePosition: position,
      clickStartPosition: position
        .divideBy(drawflow.zoomLevel)
        .subtract(drawflow.nodes.get(nodeId)!.position),
    });
  };

  /**
   * 1. Subtract the starting position of the drawflow from the mouse position, this makes the cursor relative to the start of the drawflow
   * 2. Divide by the zoom level, this zooms the working area to the relevant size
   * 3. Subtract the drawflow offset to get the final position
   */
  public globalMousePosition = () =>
    this.mousePosition
      .subtract(drawflow.startPosition)
      .divideBy(drawflow.zoomLevel)
      .subtract(drawflow.position);
}
