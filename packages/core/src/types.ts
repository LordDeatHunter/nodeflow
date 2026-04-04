import {
  Optional,
  DeepPartial,
  SelectableElementCSS,
  ConnectorSourceType,
  ConnectorDestinationType,
  SelectableElementType,
  NodeflowSettings,
} from "./nodeflow-types";
import Vec2 from "./Vec2";
import Rect from "./Rect";
import ArrayWrapper from "./ArrayWrapper";
import { MOUSE_BUTTONS, KeyboardKeyCode } from "./constants";

export type {
  Optional,
  DeepPartial,
  SelectableElementCSS,
  ConnectorSourceType,
  ConnectorDestinationType,
  SelectableElementType,
  NodeflowSettings,
};

export type DisplayFunc<T = unknown> = (props: { node: any }) => Optional<T>;

export interface SelectionBoxDataType {
  boundingBox?: Rect;
  selections: any;
}

export interface MouseDataType {
  clickStartPosition?: Vec2;
  mousePosition: Vec2;
  heldMouseButtons: Set<MOUSE_BUTTONS>;
  pointerDown: boolean;
  selections: any;
  selectionBox: any;
}

export interface KeyboardDataType {
  heldKeys: Set<KeyboardKeyCode>;
}

export interface ConnectionType {
  sourceConnector: any;
  destinationConnector: any;
}

export interface SelectableConnector {
  connector: any;
  type: SelectableElementType.Connector;
}

export interface SelectableNode {
  node: any;
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
  connectorSections: Map<string, any>;
  css: SelectableElementCSS;
  customData: CustomNodeflowDataType;
  readonly display: DisplayFunc;
  id: string;
  offset: Vec2;
  position: Vec2;
  size: Vec2;
};

export type ConnectorSectionType = {
  connectors: Map<string, any>;
  css?: string;
  id: string;
  parentNode: any;
};

export interface NodeflowDataType {
  currentMoveSpeed: Vec2;
  intervalId: Optional<number>;
  pinchDistance: number;
  position: Vec2;
  size: Vec2;
  startPosition: Vec2;
  zoomLevel: number;
}

export interface NodeflowCss {
  getNewCurveCss?: (heldConnector?: any) => string | undefined;
  nodeflow?: string;
}

export interface NodeConnectorType {
  css?: string;
  destinations: ArrayWrapper<any>;
  hovered: boolean;
  id: string;
  parentSection: ConnectorSectionType;
  position: Vec2;
  size: Vec2;
  sources: ArrayWrapper<any>;
}
