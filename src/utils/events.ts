import {
  addConnection,
  Constants,
  deselectNode,
  drawflow,
  heldKeys,
  mouseData,
  nodes,
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

export interface DrawflowEventsDataMap {
  onKeyDownInDrawflow: { event: KeyboardEvent };
  onKeyUpInDrawflow: { event: KeyboardEvent };
  onMouseDownInConnector: NodeConnectorMouseDownEventData;
  onMouseDownInDrawflow: { event: MouseEvent };
  onMouseDownInNode: NodeMouseDownEventData;
  onMouseMoveInDrawflow: { event: MouseEvent };
  onNodeConnected: NodeConnectedEventData;
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
        heldNodeId: undefined,
        heldOutputId: undefined,
      }),
  },
]);

drawflowEventStore.onMouseMoveInDrawflow.subscribeMultiple([
  {
    name: "update-mouse-position",
    event: ({ event }) => {
      setMouseData("mousePosition", new Vec2(event.clientX, event.clientY));
    },
  },
  {
    name: "update-background-position",
    event: ({ event }) => {
      updateBackgroundPosition(new Vec2(event.movementX, event.movementY));
    },
  },
]);

drawflowEventStore.onPointerUpInDrawflow.subscribeMultiple([
  {
    name: "reset-mouse-data",
    event: () =>
      setMouseData((prev) => ({
        draggingNode: false,
        heldNodeId: prev.heldOutputId ? undefined : prev.heldNodeId,
        heldOutputId: undefined,
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
      const mousePosition = new Vec2(touch.clientX, touch.clientY);

      setMouseData({
        draggingNode: true,
        heldNodeId: undefined,
        mousePosition,
        startPosition: new Vec2(
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
      const centerPosition = new Vec2(
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
        const newMousePos = new Vec2(touches[0].clientX, touches[0].clientY);
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
      }
    },
  },
]);

drawflowEventStore.onWheelInDrawflow.subscribeMultiple([
  {
    name: "update-zoom",
    event: ({ event }) => {
      updateZoom(-event.deltaY, new Vec2(event.clientX, event.clientY));
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
    name: "deselect-node",
    event: () => resetMovement(),
  },
  {
    name: "reset-mouse-data",
    event: ({ event }) =>
      setMouseData({
        draggingNode: true,
        heldNodeId: undefined,
        heldOutputId: undefined,
        mousePosition: new Vec2(event.clientX, event.clientY),
        startPosition: new Vec2(
          event.clientX / drawflow.zoomLevel - drawflow.position.x,
          event.clientY / drawflow.zoomLevel - drawflow.position.y,
        ),
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
        new Vec2(event.clientX, event.clientY),
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
      startCreatingConnection(nodeId, new Vec2(x, y), connectorId);
    },
  },
]);

drawflowEventStore.onPointerUpInConnector.subscribe(
  "connect-held-nodes",
  ({ event, nodeId, connectorId }) => {
    if (!mouseData.heldOutputId) return;
    drawflowEventStore.onNodeConnected.publish({
      outputNodeId: mouseData.heldNodeId!,
      outputId: mouseData.heldOutputId!,
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
      selectNode(nodeId, new Vec2(event.clientX, event.clientY));
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
      selectNode(nodeId, new Vec2(x, y));
    },
  },
  {
    name: "stop-propagation",
    event: ({ event }) => event.stopPropagation(),
  },
]);
