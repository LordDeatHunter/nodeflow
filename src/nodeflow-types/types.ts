import { JSX } from "solid-js";
import Vec2 from "../utils/data/Vec2";
import ConnectorSection from "../utils/data/ConnectorSection";
import NodeflowNodeData from "../utils/data/NodeflowNodeData";
import NodeConnector from "../utils/data/NodeConnector";
import ConnectorDestination from "../utils/data/ConnectorDestination";
import ConnectorSource from "../utils/data/ConnectorSource";
import { ReactiveMap } from "@solid-primitives/map";
import ArrayWrapper from "../utils/data/ArrayWrapper";
import { KeyboardKeyCode, MOUSE_BUTTONS } from "../utils/constants";
import Rect from "../utils/data/Rect";
import SelectionMap from "../utils/SelectionMap";
import SelectionBoxData from "../utils/data/SelectionBoxData";

export type Optional<T> = T | undefined;

export type DeepPartial<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
    }
  : T;

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

export enum SelectableElementType {
  Connector = "connector",
  Node = "node",
  Nodeflow = "nodeflow",
  Connection = "connection",
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

export type DisplayFunc = (props: {
  node: NodeflowNodeData;
}) => Optional<JSX.Element>;

export type NodeflowNodeType = {
  centered: boolean;
  connectorSections: ReactiveMap<string, ConnectorSection>;
  css: SelectableElementCSS;
  customData: CustomNodeflowDataType;
  readonly display: DisplayFunc;
  id: string;
  offset: Vec2;
  position: Vec2;
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
};

export type ConnectorSectionType = {
  connectors: ReactiveMap<string, NodeConnector>;
  css?: string;
  id: string;
  parentNode: NodeflowNodeData;
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

export interface SelectableElementCSS {
  normal?: string;
  selected?: string;
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
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
  sources: ArrayWrapper<ConnectorSource>;
}

export interface ConnectorSourceType {
  sourceConnector: NodeConnector;
}

export interface ConnectorDestinationType {
  css: SelectableElementCSS;
  destinationConnector: NodeConnector;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
  anchorStart: Vec2;
  anchorEnd: Vec2;
}

export type Change = {
  type: "add" | "remove" | "update";
  source: string;
  applyChange: () => void;
  undoChange: () => void;
  historyGroup: string;
};

export type NodeflowSettings = {
  allowCollision: boolean;
  canAddNodes: boolean;
  canCreateConnections: boolean;
  canDeleteConnections: boolean;
  canDeleteNodes: boolean;
  canMoveNodes: boolean;
  canPan: boolean;
  canZoom: boolean;
  debugMode: boolean;
  keyboardZoomMultiplier: number;
  maxMovementSpeed: number;
  maxZoom: number;
  minZoom: number;
  movementAcceleration: number;
  movementDeceleration: number;
  zoomMultiplier: number;
};
