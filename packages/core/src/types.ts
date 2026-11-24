import {
  Optional,
  DeepPartial,
  SelectableElementCSS,
  ConnectorSourceType,
  ConnectorDestinationType,
  SelectableElementType,
  NodeflowSettings,
  SerializedCompositeDefinition,
  NodeRotation,
} from "./nodeflow-types";
import Vec2 from "./Vec2";
import Rect from "./Rect";
import ArrayWrapper from "./ArrayWrapper";
import { MOUSE_BUTTONS, KeyboardKeyCode } from "./constants";
import type NodeflowNodeData from "./NodeflowNodeData";
import type NodeConnector from "./NodeConnector";
import type ConnectorSection from "./ConnectorSection";
import type ConnectorSource from "./ConnectorSource";
import type ConnectorDestination from "./ConnectorDestination";
import type SelectionMap from "./SelectionMap";
import type SelectionBoxData from "./SelectionBoxData";

export type {
  Optional,
  DeepPartial,
  SelectableElementCSS,
  ConnectorSourceType,
  ConnectorDestinationType,
  SelectableElementType,
  NodeflowSettings,
};

export type DisplayFunc<T = unknown> = (props: { node: NodeflowNodeData }) => Optional<T>;

export interface SelectionBoxDataType {
  boundingBox?: Rect;
  selections: SelectionMap;
}

export interface MouseDataType {
  clickStartPosition?: Vec2;
  mousePosition: Vec2;
  heldMouseButtons: Set<MOUSE_BUTTONS>;
  pointerDown: boolean;
  selections: SelectionMap;
  selectionBox: SelectionBoxData;
}

export interface KeyboardDataType {
  heldKeys: Set<KeyboardKeyCode>;
}

export interface ConnectionType {
  sourceConnector: NodeConnector;
  destinationConnector: NodeConnector;
}

export interface SelectableConnector {
  connector: NodeConnector;
  type: SelectableElementType.Connector;
}

export interface SelectableNode {
  node: NodeflowNodeData;
  type: SelectableElementType.Node;
}

export interface SelectableNodeflow {
  type: SelectableElementType.Nodeflow;
}

export interface SelectableConnection {
  connection: ConnectionType;
  type: SelectableElementType.Connection;
}

export type SelectableElement =
  | SelectableConnector
  | SelectableNode
  | SelectableNodeflow
  | SelectableConnection;

export type NodeflowNodeType = {
  centered: boolean;
  connectorSections: Map<string, ConnectorSection>;
  css: SelectableElementCSS;
  customData: CustomNodeflowDataType;
  readonly display: DisplayFunc;
  id: string;
  offset: Vec2;
  position: Vec2;
  size: Vec2;
  /** Clockwise rotation; see `NodeRotation`. 0 when missing. */
  rotation?: NodeRotation;
  composite?: SerializedCompositeDefinition;
};

export type ConnectorSectionType = {
  connectors: Map<string, NodeConnector>;
  css?: string;
  id: string;
  parentNode: NodeflowNodeData;
};

export interface NodeflowDataType {
  currentMoveSpeed: Vec2;
  intervalId: ReturnType<typeof setInterval> | undefined;
  pinchDistance: number;
  position: Vec2;
  size: Vec2;
  startPosition: Vec2;
  zoomLevel: number;
}

export interface NodeflowCss {
  getNewCurveCss?: (heldConnector?: NodeConnector) => string | undefined;
  nodeflow?: string;
}

export interface NodeConnectorType {
  css?: string;
  destinations: ArrayWrapper<ConnectorDestination>;
  hovered: boolean;
  id: string;
  parentSection: ConnectorSectionType;
  position: Vec2;
  size: Vec2;
  sources: ArrayWrapper<ConnectorSource>;
}
