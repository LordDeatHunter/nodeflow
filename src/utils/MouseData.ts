import { createStore } from "solid-js/store";
import { Vec2 } from "./vec2";
import { MouseData as MouseDataType } from "../drawflow-types";
import { drawflow, nodes, resetMovement } from "./drawflow-storage";
import { createMemo } from "solid-js";

export default class MouseData {
  private store = createStore<MouseDataType>({
    clickStartPosition: undefined,
    isDraggingNode: false,
    heldConnectorId: undefined,
    heldNodeId: undefined,
    mousePosition: Vec2.zero(),
    heldConnection: undefined,
  });

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
    param: (previous: MouseDataType) => Partial<MouseDataType>,
  ) {
    this.store[1]((previous) => param(previous));
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
        .subtract(nodes[nodeId]!.position),
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
        .subtract(nodes[nodeId]!.position),
    });
  };

  /**
   * 1. Subtract the starting position of the drawflow from the mouse position, this makes the cursor relative to the start of the drawflow
   * 2. Divide by the zoom level, this zooms the working area to the relevant size
   * 3. Subtract the drawflow offset to get the final position
   */
  public globalMousePosition = createMemo<Vec2>(() =>
    this.mousePosition
      .subtract(drawflow.startPosition)
      .divideBy(drawflow.zoomLevel)
      .subtract(drawflow.position),
  );
}
