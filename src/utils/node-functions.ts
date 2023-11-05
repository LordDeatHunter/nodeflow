import {
  addConnection,
  DefaultNodeConnectorEvents,
  drawflow,
  mouseData,
  nodes,
  setMouseData,
} from "./drawflow-storage";
import { Position } from "./position";

DefaultNodeConnectorEvents.onMouseDown = (nodeId, outputId) => (event) =>
  onOutputMouseDown(event, nodeId, outputId);
DefaultNodeConnectorEvents.onTouchStart = (nodeId, outputId) => (event) =>
  onOutputTouchStart(event, nodeId, outputId);
DefaultNodeConnectorEvents.onPointerUp = (nodeId, outputId) => (_) =>
  connectHeldNodes(nodeId, outputId);

export const onNodeMouseDown = (event: MouseEvent, nodeId: string) => {
  event.stopPropagation();
  selectNode(nodeId, new Position(event.clientX, event.clientY));
};

export const onNodeTouchStart = (event: TouchEvent, nodeId: string) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  selectNode(nodeId, new Position(x, y));
};

export const connectHeldNodes = (nodeId: string, connectorId: string) => {
  if (!mouseData.heldOutputId) return;
  onNodesConnected(
    mouseData.heldNodeId!,
    mouseData.heldOutputId!,
    nodeId,
    connectorId,
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
  connectorId: string,
) => {
  Object.values(NODE_CONNECTION_SUBSCRIPTIONS).forEach((callback) =>
    callback(outputNodeId, outputId, inputNodeId, connectorId),
  );
};

export const onOutputMouseDown = (
  event: MouseEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event;
  startCreatingConnection(nodeId, new Position(x, y), outputId);
};

export const onOutputTouchStart = (
  event: TouchEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  startCreatingConnection(nodeId, new Position(x, y), outputId);
};

export const selectNode = (nodeId: string, position: Position) => {
  const { x, y } = nodes[nodeId]!.position;
  setMouseData({
    draggingNode: true,
    heldOutputId: undefined,
    heldNodeId: nodeId,
    mousePosition: position,
    startPosition: new Position(
      position.x / drawflow.zoomLevel - x,
      position.y / drawflow.zoomLevel - y,
    ),
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
    startPosition: new Position(
      position.x / drawflow.zoomLevel - x,
      position.y / drawflow.zoomLevel - y,
    ),
  });
};

// TODO: change these to be similar to ConnectorFunctions
export const NodeFunctions = {
  onMouseDown: onNodeMouseDown,
  onTouchStart: onNodeTouchStart,
};
export type NodeFunctions = typeof NodeFunctions;

export const SetNodeFunction = <T extends keyof NodeFunctions>(
  name: T,
  value: NodeFunctions[T],
) => {
  NodeFunctions[name] = value;
};
