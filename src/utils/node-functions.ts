import { Position } from "../types/types";
import {
  addConnection,
  drawflow,
  mouseData,
  nodes,
  setMouseData,
} from "./drawflow-storage";

export const nodeFunctions = {
  onMouseDown: (event: MouseEvent, nodeId: string) => {
    event.stopPropagation();
    selectNode(nodeId, { x: event.clientX, y: event.clientY });
  },
  onTouchStart: (event: TouchEvent, nodeId: string) => {
    event.stopPropagation();
    const { clientX: x, clientY: y } = event.touches[0];
    selectNode(nodeId, { x, y });
  },
};

export const inputFunctions = {
  onPointerUp: (event: PointerEvent, nodeId: string, inputId: string) => {
    if (!mouseData.heldOutputId) return;
    onNodesConnected(
      mouseData.heldNodeId!,
      mouseData.heldOutputId!,
      nodeId,
      inputId
    );
  },
};

// TODO: implement this in another way, without direct access to the object, and move to separate file.
export const NODE_CONNECTION_SUBSCRIPTIONS: Record<
  string,
  (
    outputNodeId: string,
    outputId: string,
    inputNodeId: string,
    inputId: string
  ) => void
> = {
  "create-connection": addConnection,
  "reset-mouse-data": () => {
    setMouseData({
      draggingNode: false,
      heldNodeId: undefined,
      heldOutputId: undefined,
    });
  },
};

export const onNodesConnected = (
  outputNodeId: string,
  outputId: string,
  inputNodeId: string,
  inputId: string
) => {
  Object.values(NODE_CONNECTION_SUBSCRIPTIONS).forEach((callback) =>
    callback(outputNodeId, outputId, inputNodeId, inputId)
  );
};

export const outputFunctions = {
  onMouseDown: (event: MouseEvent, nodeId: string, outputId: string) => {
    event.stopPropagation();
    const { clientX: x, clientY: y } = event;
    startCreatingConnection(nodeId, { x, y }, outputId);
  },
  onTouchStart: (event: TouchEvent, nodeId: string, outputId: string) => {
    event.stopPropagation();
    const { clientX: x, clientY: y } = event.touches[0];
    startCreatingConnection(nodeId, { x, y }, outputId);
  },
};

export const selectNode = (nodeId: string, position: Position) => {
  const { x, y } = nodes[nodeId]!.position;
  setMouseData({
    draggingNode: true,
    heldOutputId: undefined,
    heldNodeId: nodeId,
    mousePosition: position,
    startPosition: {
      x: position.x / drawflow.zoomLevel - x,
      y: position.y / drawflow.zoomLevel - y,
    },
  });
};

export const startCreatingConnection = (
  nodeId: string,
  position: Position,
  outputId: string
) => {
  const { x, y } = nodes[nodeId]!.position;
  setMouseData({
    draggingNode: false,
    heldNodeId: nodeId,
    heldOutputId: outputId,
    mousePosition: position,
    startPosition: {
      x: position.x / drawflow.zoomLevel - x,
      y: position.y / drawflow.zoomLevel - y,
    },
  });
};
