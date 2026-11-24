import { ConnectionType, DeepPartial, NodeflowDataType } from "./types";
import type { NodeTemplate } from "./nodeflow-types";

export interface GroupMouseEventData {
  groupId: string;
  event: MouseEvent;
}

export interface GroupTouchStartEventData {
  groupId: string;
  event: TouchEvent;
}

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

export interface NodeConnectorPointerUpEventData {
  nodeId: string;
  connectorId: string;
  event: PointerEvent;
}

export type NodeCurvePointerDownEventData = ConnectionType & {
  event: PointerEvent;
};

export interface NodeflowEventsDataMap {
  onCanvasTransformChanged: { position: { x: number; y: number } };
  /** A composite node was created from `innerNodeIds`. */
  onCompositeCreated: { nodeId: string; innerNodeIds: Array<string> };
  /** A composite node was broken apart into `nodeIds`. */
  onCompositeExploded: { compositeNodeId: string; nodeIds: Array<string> };
  /**
   * Published whenever something an adapter renders changes, other than the
   * canvas transform: nodes, connectors, connections, measurements and
   * selections. Fires once per mutation; adapters should batch redraws.
   */
  onContentChanged: Record<string, never>;
  /** Published by adapters when a group's collapse toggle is pressed. */
  onGroupCollapseToggled: { groupId: string };
  onKeyDownInNodeflow: { event: KeyboardEvent };
  onKeyUpInNodeflow: { event: KeyboardEvent };
  onMouseDownInConnector: NodeConnectorMouseDownEventData;
  onMouseDownInNode: NodeMouseEventData;
  onMouseDownInGroup: GroupMouseEventData;
  onMouseDownInNodeflow: { event: MouseEvent };
  onMouseMoveInNodeflow: { event: MouseEvent };
  onNodeConnected: NodeConnectedEventData;
  onNodeDataChanged: { nodeId: string; data: DeepPartial<NodeflowDataType> };
  onPointerDownInNodeCurve: NodeCurvePointerDownEventData;
  onPointerUpInConnector: NodeConnectorPointerUpEventData;
  onPointerUpInNode: { nodeId: string; event: PointerEvent };
  onPointerUpInNodeflow: { event: PointerEvent };
  /** Fired on any template change; persist `templates.toJSON()` here. */
  onTemplatesChanged: { templates: Array<NodeTemplate> };
  onTouchCancelInNodeflow: { event: TouchEvent };
  onTouchEndInNodeflow: { event: TouchEvent };
  onTouchMoveInNodeflow: { event: TouchEvent };
  onTouchStartInConnector: NodeConnectorTouchStartEventData;
  onTouchStartInGroup: GroupTouchStartEventData;
  onTouchStartInNode: NodeTouchStartEventData;
  onTouchStartInNodeflow: { event: TouchEvent };
  onWheelInNodeflow: { event: WheelEvent };
}

export type NodeflowEvent<T extends keyof NodeflowEventsDataMap> = (
  data: NodeflowEventsDataMap[T],
) => void;

export interface DocumentEventsDataMap {
  onMouseMoveInDocument: { event: MouseEvent };
  onPointerLeaveFromDocument: { event: PointerEvent };
  onPointerUpInDocument: { event: PointerEvent };
}

export type DocumentEvent<T extends keyof DocumentEventsDataMap> = (
  data: DocumentEventsDataMap[T],
) => void;
