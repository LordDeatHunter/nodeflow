import { Position } from "../types/types";
import {
  addConnection,
  drawflow,
  mouseData,
  nodes,
  setMouseData,
} from "./drawflow-storage";

export const onNodeMouseDown = (event: MouseEvent, nodeId: string) => {
  event.stopPropagation();
  selectNode(nodeId, { x: event.clientX, y: event.clientY });
};

export const onNodeTouchStart = (event: TouchEvent, nodeId: string) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  selectNode(nodeId, { x, y });
};

export const onInputPointerUp = (
  event: PointerEvent,
  nodeId: string,
  inputId: string,
) => {
  if (!mouseData.heldOutputId) return;
  onNodesConnected(
    mouseData.heldNodeId!,
    mouseData.heldOutputId!,
    nodeId,
    inputId,
  );
};

// TODO: implement this in another way, without direct access to the object, and move to separate file.
export const NODE_CONNECTION_SUBSCRIPTIONS: Record<
  string,
  (
    outputNodeId: string,
    outputId: string,
    inputNodeId: string,
    inputId: string,
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
  inputId: string,
) => {
  Object.values(NODE_CONNECTION_SUBSCRIPTIONS).forEach((callback) =>
    callback(outputNodeId, outputId, inputNodeId, inputId),
  );
};

export const onOutputMouseDown = (
  event: MouseEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event;
  startCreatingConnection(nodeId, { x, y }, outputId);
};

export const onOutputTouchStart = (
  event: TouchEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  startCreatingConnection(nodeId, { x, y }, outputId);
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
  outputId: string,
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

export const InputFunctions = {
  onPointerUp: onInputPointerUp,
} as const;
export type InputFunctions = typeof InputFunctions;

export const OutputFunctions = {
  onMouseDown: onOutputMouseDown,
  onTouchStart: onOutputTouchStart,
};
export type OutputFunctions = typeof OutputFunctions;

export const NodeFunctions = {
  onMouseDown: onNodeMouseDown,
  onTouchStart: onNodeTouchStart,
};
export type NodeFunctions = typeof NodeFunctions;

export const SetInputFunction = <T extends keyof InputFunctions>(
  name: T,
  value: InputFunctions[T],
) => {
  InputFunctions[name] = value;
};
export const SetOutputFunction = <T extends keyof OutputFunctions>(
  name: T,
  value: OutputFunctions[T],
) => {
  OutputFunctions[name] = value;
};
export const SetNodeFunction = <T extends keyof NodeFunctions>(
  name: T,
  value: NodeFunctions[T],
) => {
  NodeFunctions[name] = value;
};
