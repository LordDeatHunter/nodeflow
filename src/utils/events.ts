import {
  addConnection,
  changes,
  Constants,
  deselectNode,
  drawflow,
  heldKeys,
  mouseData,
  nodes,
  removeConnection,
  removeNode,
  resetMovement,
  selectNode,
  setDrawflow,
  setMouseData,
  startCreatingConnection,
  updateBackgroundPosition,
  updateZoom,
} from "./drawflow-storage";
import { DrawflowEventPublisher } from "./EventPublishers";
import { Vec2 } from "./vec2";
import { windowSize } from "./screen-utils";
import { DeepPartial, DrawflowData, NodeConnector } from "../drawflow-types";

export interface NodeConnectedEventData {
  outputNodeId: string;
  outputId: string;
  inputNodeId: string;
  inputId: string;
  event: PointerEvent;
}

export interface NodeConnectorMouseDownEventData {
  nodeId: string;
  connectorId: string;
  event: MouseEvent;
}

export interface NodeMouseDownEventData {
  nodeId: string;
  event: MouseEvent;
}

export interface NodeTouchStartEventData {
  nodeId: string;
  event: TouchEvent;
}

export interface NodeConnectorTouchStartEventData {
  nodeId: string;
  connectorId: string;
  event: TouchEvent;
}

export interface NodeConnectorTouchStartEventData {
  nodeId: string;
  connectorId: string;
  event: TouchEvent;
}

export interface NodeConnectorPointerUpEventData {
  nodeId: string;
  connectorId: string;
  event: PointerEvent;
}

export interface NodeCurvePointerDownEventData {
  event: PointerEvent;
  sourceConnector: NodeConnector;
  destinationConnector: NodeConnector;
}

export interface DrawflowEventsDataMap {
  onKeyDownInDrawflow: { event: KeyboardEvent };
  onKeyUpInDrawflow: { event: KeyboardEvent };
  onMouseDownInConnector: NodeConnectorMouseDownEventData;
  onMouseDownInDrawflow: { event: MouseEvent };
  onMouseDownInNode: NodeMouseDownEventData;
  onMouseMoveInDrawflow: { event: MouseEvent };
  onNodeConnected: NodeConnectedEventData;
  onNodeDataChanged: { nodeId: string; data: DeepPartial<DrawflowData> };
  onPointerDownInNodeCurve: NodeCurvePointerDownEventData;
  onPointerUpInConnector: NodeConnectorPointerUpEventData;
  onPointerUpInDrawflow: { event: PointerEvent };
  onTouchMoveInDrawflow: { event: TouchEvent };
  onTouchStartInConnector: NodeConnectorTouchStartEventData;
  onTouchStartInDrawflow: { event: TouchEvent };
  onTouchStartInNode: NodeTouchStartEventData;
  onWheelInDrawflow: { event: WheelEvent };
}

export type DrawflowEvent<T extends keyof DrawflowEventsDataMap> = (
  data: DrawflowEventsDataMap[T],
) => void;

export type DrawflowEventRecord = {
  [K in keyof DrawflowEventsDataMap]: DrawflowEventPublisher<K>;
};

export const drawflowEventStore: DrawflowEventRecord = {
  onKeyDownInDrawflow: new DrawflowEventPublisher<"onKeyDownInDrawflow">(),
  onKeyUpInDrawflow: new DrawflowEventPublisher<"onKeyUpInDrawflow">(),
  onMouseDownInConnector:
    new DrawflowEventPublisher<"onMouseDownInConnector">(),
  onMouseDownInDrawflow: new DrawflowEventPublisher<"onMouseDownInDrawflow">(),
  onMouseDownInNode: new DrawflowEventPublisher<"onMouseDownInNode">(),
  onMouseMoveInDrawflow: new DrawflowEventPublisher<"onMouseMoveInDrawflow">(),
  onNodeConnected: new DrawflowEventPublisher<"onNodeConnected">(),
  onNodeDataChanged: new DrawflowEventPublisher<"onNodeDataChanged">(),
  onPointerDownInNodeCurve:
    new DrawflowEventPublisher<"onPointerDownInNodeCurve">(),
  onPointerUpInConnector:
    new DrawflowEventPublisher<"onPointerUpInConnector">(),
  onPointerUpInDrawflow: new DrawflowEventPublisher<"onPointerUpInDrawflow">(),
  onTouchMoveInDrawflow: new DrawflowEventPublisher<"onTouchMoveInDrawflow">(),
  onTouchStartInConnector:
    new DrawflowEventPublisher<"onTouchStartInConnector">(),
  onTouchStartInDrawflow:
    new DrawflowEventPublisher<"onTouchStartInDrawflow">(),
  onTouchStartInNode: new DrawflowEventPublisher<"onTouchStartInNode">(),
  onWheelInDrawflow: new DrawflowEventPublisher<"onWheelInDrawflow">(),
};

drawflowEventStore.onNodeConnected.subscribeMultiple([
  {
    name: "create-connection",
    event: (data) =>
      addConnection(
        data.inputNodeId,
        data.inputId,
        data.outputNodeId,
        data.outputId,
      ),
  },
  {
    name: "reset-mouse-data",
    event: () =>
      setMouseData({
        draggingNode: false,
        heldConnection: undefined,
        heldConnectorId: undefined,
        heldNodeId: undefined,
      }),
  },
]);

drawflowEventStore.onMouseMoveInDrawflow.subscribeMultiple([
  {
    name: "update-mouse-position",
    event: ({ event }) => {
      setMouseData("mousePosition", Vec2.of(event.clientX, event.clientY));
    },
  },
  {
    name: "update-background-position",
    event: ({ event }) => {
      updateBackgroundPosition(Vec2.of(event.movementX, event.movementY));
    },
  },
]);

drawflowEventStore.onPointerUpInDrawflow.subscribeMultiple([
  {
    name: "reset-mouse-data",
    event: () =>
      setMouseData((prev) => ({
        draggingNode: false,
        heldConnectorId: undefined,
        heldNodeId: prev.heldConnectorId ? undefined : prev.heldNodeId,
      })),
  },
]);

drawflowEventStore.onTouchStartInDrawflow.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
  {
    name: "clear-held-keys",
    event: ({ event }) => {
      if (event.touches.length === 1) {
        heldKeys.clear();
      }
    },
  },
  {
    name: "handle-pinch",
    event: ({ event }) => {
      const { touches } = event;

      if (touches.length !== 2) {
        return;
      }

      const { pageX: touch1X, pageY: touch1Y } = event.touches[0];
      const { pageX: touch2X, pageY: touch2Y } = event.touches[1];
      setDrawflow(
        "pinchDistance",
        Math.hypot(touch1X - touch2X, touch1Y - touch2Y),
      );
    },
  },
  {
    name: "update-mouse-data",
    event: ({ event }) => {
      const { touches } = event;

      if (touches.length !== 1) return;

      const touch = touches[0];
      const mousePosition = Vec2.of(touch.clientX, touch.clientY);

      setMouseData({
        draggingNode: true,
        heldNodeId: undefined,
        mousePosition,
        clickStartPosition: Vec2.of(
          touch.clientX / drawflow.zoomLevel - drawflow.position.x,
          touch.clientY / drawflow.zoomLevel - drawflow.position.y,
        ),
      });
    },
  },
]);

drawflowEventStore.onTouchMoveInDrawflow.subscribeMultiple([
  {
    name: "handle-pinch",
    event: ({ event }) => {
      const { touches } = event;
      if (touches.length !== 2) return;

      const { pageX: touch1X, pageY: touch1Y } = touches[0];
      const { pageX: touch2X, pageY: touch2Y } = touches[1];
      const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
      const centerPosition = Vec2.of(
        (touch1X + touch2X) / 2,
        (touch1Y + touch2Y) / 2,
      );
      updateZoom(currDist - drawflow.pinchDistance, centerPosition);
      setDrawflow("pinchDistance", currDist);
    },
  },
  {
    name: "update-mouse-data",
    event: ({ event }) => {
      const { touches } = event;

      if (touches.length !== 1) return;

      setMouseData("mousePosition", (mousePosition) => {
        const newMousePos = Vec2.of(touches[0].clientX, touches[0].clientY);
        updateBackgroundPosition(newMousePos.subtract(mousePosition));
        return newMousePos;
      });
    },
  },
]);

drawflowEventStore.onKeyUpInDrawflow.subscribe("remove-held-key", ({ event }) =>
  heldKeys.delete(event.key),
);

drawflowEventStore.onKeyDownInDrawflow.subscribeMultiple([
  {
    name: "add-held-key",
    event: ({ event }) => heldKeys.add(event.key),
  },
  {
    name: "handle-controls",
    event: ({ event }) => {
      // TODO: change to map
      switch (event.code) {
        case "Delete":
          if (mouseData.heldNodeId) {
            removeNode(mouseData.heldNodeId);
          } else if (mouseData.heldConnection) {
            removeConnection(
              mouseData.heldConnection.sourceConnector.parentSection.parentNode
                .id,
              mouseData.heldConnection.sourceConnector.id,
              mouseData.heldConnection.destinationConnector.parentSection
                .parentNode.id,
              mouseData.heldConnection.destinationConnector.id,
            );
          }
          break;
        case "Escape":
          deselectNode();
          break;
        case "Space":
          if (mouseData.heldNodeId) {
            console.log(nodes[mouseData.heldNodeId]);
          }
          break;
        case "Equal":
        case "Minus":
          if (event.ctrlKey) {
            event.preventDefault();
            updateZoom(
              Constants.KEYBOARD_ZOOM_AMOUNT *
                (event.code === "Equal" ? 1 : -1),
              windowSize().divideBy(2),
            );
          }
          break;
        case "KeyZ":
          if (!event.ctrlKey) {
            break;
          }
          event.preventDefault();
          if (event.shiftKey) {
            changes.redo();
          } else {
            changes.undo();
          }
          break;
      }
    },
  },
]);

drawflowEventStore.onWheelInDrawflow.subscribeMultiple([
  {
    name: "update-zoom",
    event: ({ event }) => {
      updateZoom(-event.deltaY, Vec2.of(event.clientX, event.clientY));
    },
  },
  {
    name: "prevent-scroll",
    event: ({ event }) => {
      event.preventDefault();
    },
  },
]);

drawflowEventStore.onMouseDownInDrawflow.subscribeMultiple([
  {
    name: "reset-movement",
    event: () => resetMovement(),
  },
  {
    name: "reset-mouse-data",
    event: ({ event }) =>
      setMouseData({
        clickStartPosition: Vec2.of(
          event.clientX / drawflow.zoomLevel - drawflow.position.x,
          event.clientY / drawflow.zoomLevel - drawflow.position.y,
        ),
        draggingNode: true,
        heldConnection: undefined,
        heldConnectorId: undefined,
        heldNodeId: undefined,
        mousePosition: Vec2.of(event.clientX, event.clientY),
      }),
  },
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
]);

drawflowEventStore.onMouseDownInConnector.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
  {
    name: "start-creating-connection",
    event: ({ event, nodeId, connectorId }) => {
      startCreatingConnection(
        nodeId,
        Vec2.of(event.clientX, event.clientY),
        connectorId,
      );
    },
  },
]);

drawflowEventStore.onTouchStartInConnector.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
  {
    name: "start-creating-connection",
    event: ({ event, nodeId, connectorId }) => {
      const { clientX: x, clientY: y } = event.touches[0];
      startCreatingConnection(nodeId, Vec2.of(x, y), connectorId);
    },
  },
]);

drawflowEventStore.onPointerUpInConnector.subscribe(
  "connect-held-nodes",
  ({ event, nodeId, connectorId }) => {
    if (!mouseData.heldConnectorId) return;
    drawflowEventStore.onNodeConnected.publish({
      outputNodeId: mouseData.heldNodeId!,
      outputId: mouseData.heldConnectorId!,
      inputNodeId: nodeId,
      inputId: connectorId,
      event,
    });
  },
);

drawflowEventStore.onMouseDownInNode.subscribeMultiple([
  {
    name: "select-node",
    event: ({ event, nodeId }) => {
      selectNode(nodeId, Vec2.of(event.clientX, event.clientY));
    },
  },
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
]);

drawflowEventStore.onTouchStartInNode.subscribeMultiple([
  {
    name: "select-node",
    event: ({ event, nodeId }) => {
      const { clientX: x, clientY: y } = event.touches[0];
      selectNode(nodeId, Vec2.of(x, y));
    },
  },
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
]);

drawflowEventStore.onPointerDownInNodeCurve.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => {
      event.preventDefault();
      event.stopPropagation();
    },
    priority: 1,
  },
  {
    name: "update-mouse-data",
    event: ({ event, sourceConnector, destinationConnector }) =>
      setMouseData({
        draggingNode: false,
        heldConnection: {
          sourceConnector,
          destinationConnector,
        },
        heldConnectorId: undefined,
        heldNodeId: undefined,
        mousePosition: Vec2.of(event.clientX, event.clientY),
      }),
  },
]);
