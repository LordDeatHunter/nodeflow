import { JSX } from "solid-js";
import Vec2 from "../utils/data/Vec2";
import ConnectorSectionClass from "../utils/data/ConnectorSection";
import DrawflowNodeClass from "../utils/data/DrawflowNodeData";
import NodeConnectorClass from "../utils/data/NodeConnector";
import ConnectorDestinationClass from "../utils/data/ConnectorDestination";
import ConnectorSourceClass from "../utils/data/ConnectorSource";
import { ReactiveMap } from "@solid-primitives/map";
import ArrayWrapper from "../utils/data/ArrayWrapper";

export type Optional<T> = T | undefined;

export type DeepPartial<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
    }
  : T;

export interface MouseDataType {
  clickStartPosition?: Vec2;
  heldConnection?: {
    sourceConnector: NodeConnectorClass;
    destinationConnector: NodeConnectorClass;
  };
  heldConnectorId?: string;
  heldNodeId?: string;
  isDraggingNode: boolean;
  mousePosition: Vec2;
}

export type DisplayFunc = (props: {
  node: DrawflowNodeClass;
}) => Optional<JSX.Element>;

export type DrawflowNodeType = {
  centered: boolean;
  connectorSections: ReactiveMap<string, ConnectorSectionClass>;
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
  connectors: ReactiveMap<string, NodeConnectorClass>;
  css?: string;
  id: string;
  parentNode: DrawflowNodeClass;
};

export interface DrawflowDataType {
  currentMoveSpeed: Vec2;
  pinchDistance: number;
  position: Vec2;
  startPosition: Vec2;
  size: Vec2;
  zoomLevel: number;
}

export interface SelectableElementCSS {
  normal?: string;
  selected?: string;
}

export interface DrawflowCss {
  newCurve?: string;
  drawflow?: string;
}

export interface NodeConnectorType {
  css?: string;
  destinations: ArrayWrapper<ConnectorDestinationClass>;
  hovered: boolean;
  id: string;
  parentSection: ConnectorSectionType;
  position: Vec2;
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
  sources: ArrayWrapper<ConnectorSourceClass>;
}

export interface ConnectorSourceType {
  sourceConnector: NodeConnectorClass;
}

export interface ConnectorDestinationType {
  css: SelectableElementCSS;
  destinationConnector: NodeConnectorClass;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
}

export type Change = {
  type: "add" | "remove" | "update";
  source: string;
  applyChange: () => void;
  undoChange: () => void;
};
