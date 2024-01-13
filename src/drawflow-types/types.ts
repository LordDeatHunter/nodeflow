import { JSX } from "solid-js";
import { Vec2 } from "../utils/vec2";
import ConnectorSectionClass from "../utils/ConnectorSection";
import DrawflowNodeClass from "../utils/DrawflowNode";
import NodeConnectorClass from "../utils/NodeConnector";
import ConnectorDestinationClass from "../utils/ConnectorDestination";
import ConnectorSourceClass from "../utils/ConnectorSource";
import { ReactiveMap } from "@solid-primitives/map";
import ArrayWrapper from "../utils/ArrayWrapper";

export type Optional<T> = T | undefined;

export type DeepPartial<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
    }
  : T;

export interface MouseData {
  clickStartPosition?: Vec2;
  isDraggingNode: boolean;
  heldNodeId?: string;
  heldConnectorId?: string;
  heldConnection?: {
    sourceConnector: NodeConnectorClass;
    destinationConnector: NodeConnectorClass;
  };
  mousePosition: Vec2;
}

export type DrawflowNode = {
  centered: boolean;
  connectorSections: ReactiveMap<string, ConnectorSectionClass>;
  css: SelectableElementCSS;
  customData: SolidDrawflow.CustomDataType;
  readonly display: (props: {
    node: DrawflowNodeClass;
  }) => Optional<JSX.Element>;
  id: string;
  offset: Vec2;
  position: Vec2;
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
};

export type ConnectorSection = {
  connectors: ReactiveMap<string, NodeConnectorClass>;
  css?: string;
  id: string;
  parentNode: DrawflowNodeClass;
};

export interface DrawflowData {
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

export interface NodeConnector {
  css?: string;
  destinations: ArrayWrapper<ConnectorDestinationClass>;
  hovered: boolean;
  id: string;
  parentSection: ConnectorSection;
  position: Vec2;
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
  sources: ArrayWrapper<ConnectorSourceClass>;
}

export interface ConnectorSource {
  sourceConnector: NodeConnectorClass;
}

export interface ConnectorDestination {
  css: SelectableElementCSS;
  destinationConnector: NodeConnectorClass;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
}
