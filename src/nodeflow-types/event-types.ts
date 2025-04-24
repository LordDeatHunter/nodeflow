import {
  ConnectionType,
  DeepPartial,
  NodeflowDataType,
  Optional,
} from "./index";
import {
  CustomNodeData,
  DocumentEventPublisher,
  NodeflowEventPublisher,
  Vec2,
} from "../utils";

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

export type NodeCurvePointerDownEventData = ConnectionType & {
  event: PointerEvent;
};

export interface NodeflowEventsDataMap {
  onKeyDownInNodeflow: { event: KeyboardEvent };
  onKeyUpInNodeflow: { event: KeyboardEvent };
  onMouseDownInConnector: NodeConnectorMouseDownEventData;
  onMouseDownInNode: NodeMouseEventData;
  onMouseDownInNodeflow: { event: MouseEvent };
  onMouseMoveInNodeflow: { event: MouseEvent };
  onNodeConnected: NodeConnectedEventData;
  onNodeDataChanged: { nodeId: string; data: DeepPartial<NodeflowDataType> };
  onNodeCustomDataChanged: {
    nodeId: string;
    customData: Optional<CustomNodeData>;
  };
  onPointerDownInNodeCurve: NodeCurvePointerDownEventData;
  onPointerUpInConnector: NodeConnectorPointerUpEventData;
  onPointerUpInNode: { nodeId: string; event: PointerEvent };
  onPointerUpInNodeflow: { event: PointerEvent };
  onTouchMoveInNodeflow: { event: TouchEvent };
  onTouchStartInConnector: NodeConnectorTouchStartEventData;
  onTouchStartInNode: NodeTouchStartEventData;
  onTouchStartInNodeflow: { event: TouchEvent };
  onWheelInNodeflow: { event: WheelEvent };
  onNodeAdded: { nodeId: string };
  onNodeRemoved: { nodeId: string };
  onNodeflowMoved: { position: Vec2 };
  onNodeMoved: { nodeId: string; position: Vec2 };
  onConnectorSectionAdded: { nodeId: string; sectionId: string };
  onConnectorSectionRemoved: { nodeId: string; sectionId: string };
  onConnectorAdded: {
    nodeId: string;
    sectionId: string;
    connectorId: string;
  };
  onConnectorRemoved: {
    nodeId: string;
    sectionId: string;
    connectorId: string;
  };
  onConnectionAdded: {
    sourceNodeId: string;
    sourceConnectorId: string;
    destinationNodeId: string;
    destinationConnectorId: string;
  };
  onConnectionRemoved: {
    sourceNodeId: string;
    sourceConnectorId: string;
    destinationNodeId: string;
    destinationConnectorId: string;
  };
}

export type NodeflowEvent<T extends keyof NodeflowEventsDataMap> = (
  data: NodeflowEventsDataMap[T],
) => void;

export type NodeflowEventRecord = {
  [K in keyof NodeflowEventsDataMap]: NodeflowEventPublisher<K>;
};

export interface DocumentEventsDataMap {
  onMouseMoveInDocument: { event: MouseEvent };
  onPointerLeaveFromDocument: { event: PointerEvent };
  onPointerUpInDocument: { event: PointerEvent };
}

export type DocumentEvent<T extends keyof DocumentEventsDataMap> = (
  data: DocumentEventsDataMap[T],
) => void;

export type DocumentEventRecord = {
  [K in keyof DocumentEventsDataMap]: DocumentEventPublisher<K>;
};
