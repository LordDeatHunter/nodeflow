import {
  DefaultNodeConnectorEvents,
  DefaultNodeEvents,
  drawflow,
  mouseData,
  nodes,
  setMouseData,
} from "./drawflow-storage";
import { Vec2 } from "./vec2";
import { drawflowEventStore } from "./events";

DefaultNodeConnectorEvents.onMouseDown = (nodeId, outputId) => (event) =>
  onOutputMouseDown(event, nodeId, outputId);
DefaultNodeConnectorEvents.onTouchStart = (nodeId, outputId) => (event) =>
  onOutputTouchStart(event, nodeId, outputId);
DefaultNodeConnectorEvents.onPointerUp = (nodeId, outputId) => (_) =>
  connectHeldNodes(nodeId, outputId);

DefaultNodeEvents.onMouseDown = (nodeId) => (event) =>
  onNodeMouseDown(event, nodeId);
DefaultNodeEvents.onTouchStart = (nodeId) => (event) =>
  onNodeTouchStart(event, nodeId);

export const onOutputMouseDown = (
  event: MouseEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event;
  startCreatingConnection(nodeId, new Vec2(x, y), outputId);
};

export const onOutputTouchStart = (
  event: TouchEvent,
  nodeId: string,
  outputId: string,
) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  startCreatingConnection(nodeId, new Vec2(x, y), outputId);
};

export const selectNode = (nodeId: string, position: Vec2) => {
  const { x, y } = nodes[nodeId]!.position;
  setMouseData({
    draggingNode: true,
    heldOutputId: undefined,
    heldNodeId: nodeId,
    mousePosition: position,
    startPosition: new Vec2(
      position.x / drawflow.zoomLevel - x,
      position.y / drawflow.zoomLevel - y,
    ),
  });
};

export const connectHeldNodes = (nodeId: string, connectorId: string) => {
  if (!mouseData.heldOutputId) return;
  drawflowEventStore.onNodeConnected.publish({
    outputNodeId: mouseData.heldNodeId!,
    outputId: mouseData.heldOutputId!,
    inputNodeId: nodeId,
    inputId: connectorId,
  });
};

export const onNodeMouseDown = (event: MouseEvent, nodeId: string) => {
  event.stopPropagation();
  selectNode(nodeId, new Vec2(event.clientX, event.clientY));
};

export const onNodeTouchStart = (event: TouchEvent, nodeId: string) => {
  event.stopPropagation();
  const { clientX: x, clientY: y } = event.touches[0];
  selectNode(nodeId, new Vec2(x, y));
};

export const startCreatingConnection = (
  nodeId: string,
  position: Vec2,
  outputId: string,
) => {
  const { x, y } = nodes[nodeId]!.position;
  setMouseData({
    draggingNode: false,
    heldNodeId: nodeId,
    heldOutputId: outputId,
    mousePosition: position,
    startPosition: new Vec2(
      position.x / drawflow.zoomLevel - x,
      position.y / drawflow.zoomLevel - y,
    ),
  });
};
