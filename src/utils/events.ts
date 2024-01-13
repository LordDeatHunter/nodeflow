import {
  addConnection,
  changes,
  Constants,
  drawflow,
  heldKeys,
  mouseData,
  nodes,
  removeConnection,
  removeNode,
  resetMovement,
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

export interface NodeMouseEventData {
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
  onMouseDownInNode: NodeMouseEventData;
  onMouseMoveInDocument: { event: MouseEvent };
  onMouseMoveInDrawflow: { event: MouseEvent };
  onNodeConnected: NodeConnectedEventData;
  onNodeDataChanged: { nodeId: string; data: DeepPartial<DrawflowData> };
  onPointerDownInNodeCurve: NodeCurvePointerDownEventData;
  onPointerLeaveFromDocument: { event: PointerEvent };
  onPointerUpInConnector: NodeConnectorPointerUpEventData;
  onPointerUpInDocument: { event: PointerEvent };
  onPointerUpInDrawflow: { event: PointerEvent };
  onPointerUpInNode: { nodeId: string; event: PointerEvent };
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
  onMouseMoveInDocument: new DrawflowEventPublisher<"onMouseMoveInDocument">(),
  onMouseMoveInDrawflow: new DrawflowEventPublisher<"onMouseMoveInDrawflow">(),
  onNodeConnected: new DrawflowEventPublisher<"onNodeConnected">(),
  onNodeDataChanged: new DrawflowEventPublisher<"onNodeDataChanged">(),
  onPointerDownInNodeCurve:
    new DrawflowEventPublisher<"onPointerDownInNodeCurve">(),
  onPointerLeaveFromDocument:
    new DrawflowEventPublisher<"onPointerLeaveFromDocument">(),
  onPointerUpInConnector:
    new DrawflowEventPublisher<"onPointerUpInConnector">(),
  onPointerUpInDocument: new DrawflowEventPublisher<"onPointerUpInDocument">(),
  onPointerUpInDrawflow: new DrawflowEventPublisher<"onPointerUpInDrawflow">(),
  onPointerUpInNode: new DrawflowEventPublisher<"onPointerUpInNode">(),
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
    event: () => mouseData.reset(),
  },
]);

drawflowEventStore.onMouseMoveInDrawflow.subscribeMultiple([
  {
    name: "update-background-position",
    event: ({ event }) => {
      drawflow.updateBackgroundPosition(
        Vec2.of(event.movementX, event.movementY),
      );
    },
  },
]);

drawflowEventStore.onPointerUpInDrawflow.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => {
      event.stopPropagation();
      event.preventDefault();
    },
  },
  {
    name: "reset-mouse-data",
    event: () =>
      mouseData.updateWithPrevious((prev) => ({
        isDraggingNode: false,
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
      drawflow.pinchDistance = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
    },
  },
  {
    name: "update-mouse-data",
    event: ({ event }) => {
      const { touches } = event;

      if (touches.length !== 1) return;

      const touch = touches[0];
      const mousePosition = Vec2.fromEvent(touch);

      mouseData.update({
        isDraggingNode: true,
        heldNodeId: undefined,
        mousePosition,
        clickStartPosition: Vec2.of(
          mousePosition.x / drawflow.zoomLevel - drawflow.position.x,
          mousePosition.y / drawflow.zoomLevel - drawflow.position.y,
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
      drawflow.updateZoom(currDist - drawflow.pinchDistance, centerPosition);
      drawflow.pinchDistance = currDist;
    },
  },
  {
    name: "update-mouse-data",
    event: ({ event }) => {
      const { touches } = event;

      if (touches.length !== 1) return;

      mouseData.updateWithPrevious((previous) => {
        const newMousePos = Vec2.fromEvent(touches[0]);
        drawflow.updateBackgroundPosition(
          newMousePos.subtract(previous.mousePosition),
        );
        return { mousePosition: newMousePos };
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
          mouseData.deselectNode();
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
            drawflow.updateZoom(
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
      drawflow.updateZoom(-event.deltaY, Vec2.fromEvent(event));
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
      mouseData.update({
        clickStartPosition: Vec2.of(
          event.clientX / drawflow.zoomLevel - drawflow.position.x,
          event.clientY / drawflow.zoomLevel - drawflow.position.y,
        ),
        isDraggingNode: true,
        heldConnection: undefined,
        heldConnectorId: undefined,
        heldNodeId: undefined,
        mousePosition: Vec2.fromEvent(event),
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
      mouseData.startCreatingConnection(
        nodeId,
        Vec2.fromEvent(event),
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
      mouseData.startCreatingConnection(nodeId, Vec2.of(x, y), connectorId);
    },
  },
]);

drawflowEventStore.onPointerUpInConnector.subscribeMultiple([
  {
    name: "stop-propagation",
    event: ({ event }) => {
      event.preventDefault();
      event.stopPropagation();
    },
    priority: 2,
  },
  {
    name: "connect-held-nodes",
    event: ({ event, nodeId, connectorId }) => {
      if (!mouseData.heldConnectorId) return;
      drawflowEventStore.onNodeConnected.publish({
        outputNodeId: mouseData.heldNodeId!,
        outputId: mouseData.heldConnectorId!,
        inputNodeId: nodeId,
        inputId: connectorId,
        event,
      });
    },
    priority: 2,
  },
  {
    name: "reset-mouse-data",
    event: () =>
      mouseData.update({
        isDraggingNode: false,
        heldConnectorId: undefined,
        heldNodeId: undefined,
      }),
    priority: 1,
  },
]);

drawflowEventStore.onMouseDownInNode.subscribeMultiple([
  {
    name: "select-node",
    event: ({ event, nodeId }) => {
      mouseData.selectNode(nodeId, Vec2.fromEvent(event));
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
      mouseData.selectNode(nodeId, Vec2.of(x, y));
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
      mouseData.update({
        isDraggingNode: false,
        heldConnection: {
          sourceConnector,
          destinationConnector,
        },
        heldConnectorId: undefined,
        heldNodeId: undefined,
        mousePosition: Vec2.fromEvent(event),
      }),
  },
]);

drawflowEventStore.onPointerUpInNode.subscribeMultiple([
  {
    name: "reset-mouse-data",
    event: () =>
      mouseData.update({
        isDraggingNode: false,
        heldConnection: undefined,
        heldConnectorId: undefined,
      }),
  },
]);

drawflowEventStore.onMouseMoveInDocument.subscribeMultiple([
  {
    name: "update-mouse-position",
    event: ({ event }) => {
      mouseData.mousePosition = Vec2.fromEvent(event);
    },
  },
]);

drawflowEventStore.onPointerLeaveFromDocument.subscribeMultiple([
  {
    name: "reset-mouse-data",
    event: () => mouseData.reset(),
  },
]);

drawflowEventStore.onPointerUpInDocument.subscribeMultiple([
  // TODO: figure out why this is always called, even when elements lower in the DOM have cancelled the event
  // {
  //   name: "reset-mouse-data",
  //   event: () => resetMouseData(),
  // },
]);
