import { ConnectionType, DeepPartial, NodeflowDataType } from "./index";
import { DocumentEventPublisher, NodeflowEventPublisher } from "../utils";

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
  onPointerDownInNodeCurve: NodeCurvePointerDownEventData;
  onPointerUpInConnector: NodeConnectorPointerUpEventData;
  onPointerUpInNode: { nodeId: string; event: PointerEvent };
  onPointerUpInNodeflow: { event: PointerEvent };
  onTouchMoveInNodeflow: { event: TouchEvent };
  onTouchStartInConnector: NodeConnectorTouchStartEventData;
  onTouchStartInNode: NodeTouchStartEventData;
  onTouchStartInNodeflow: { event: TouchEvent };
  onWheelInNodeflow: { event: WheelEvent };
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
