import {
  addConnection,
  DefaultNodeConnectorEvents,
  drawflow,
  mouseData,
  nodes,
  setMouseData,
} from "./drawflow-storage";
import { Vec2 } from "./vec2";

DefaultNodeConnectorEvents.onMouseDown = (nodeId, outputId) => (event) =>
  onOutputMouseDown(event, nodeId, outputId);
DefaultNodeConnectorEvents.onTouchStart = (nodeId, outputId) => (event) =>
  onOutputTouchStart(event, nodeId, outputId);
DefaultNodeConnectorEvents.onPointerUp = (nodeId, outputId) => (_) =>
  connectHeldNodes(nodeId, outputId);

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

export const connectHeldNodes = (nodeId: string, connectorId: string) => {
  if (!mouseData.heldOutputId) return;
  drawflowEventStore.onNodeConnected.publish(
    mouseData.heldNodeId!,
    mouseData.heldOutputId!,
    nodeId,
    connectorId,
  );
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

export interface DrawflowEvents {
  onNodeConnected: (
    outputNodeId: string,
    outputId: string,
    inputNodeId: string,
    inputId: string,
  ) => void;
}

type DrawflowEventNames = keyof DrawflowEvents;
type DrawflowEventCallbacks = DrawflowEvents[DrawflowEventNames];

export class EventPublisher<T extends DrawflowEventCallbacks> {
  private subscriptions = new Map<string, T>();

  subscribe(key: string, callback: T) {
    console.log(this.subscriptions);
    console.log(key);
    this.subscriptions.set(key, callback);
  }

  unsubscribe(key: string) {
    this.subscriptions.delete(key);
  }

  publish(...args: Parameters<T>) {
    this.subscriptions.forEach((callback) => callback.call(null, ...args));
  }

  clear() {
    this.subscriptions.clear();
  }

  get size() {
    return this.subscriptions.size;
  }

  get isEmpty() {
    return this.size === 0;
  }
}

export type DrawflowEventParams<T> = T extends (...args: infer P) => void
  ? P
  : never;

type DrawflowEventRecord = {
  [K in keyof DrawflowEvents]: EventPublisher<DrawflowEvents[K]>;
};

export const drawflowEventStore: DrawflowEventRecord = {
  onNodeConnected: new EventPublisher<DrawflowEvents["onNodeConnected"]>(),
};

drawflowEventStore.onNodeConnected.subscribe(
  "create-connection",
  addConnection,
);
drawflowEventStore.onNodeConnected.subscribe("reset-mouse-data", () => {
  setMouseData({
    draggingNode: false,
    heldNodeId: undefined,
    heldOutputId: undefined,
  });
});

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
