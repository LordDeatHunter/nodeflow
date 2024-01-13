import { JSX } from "solid-js";
import { Vec2 } from "../utils/vec2";

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
    sourceConnector: NodeConnector;
    destinationConnector: NodeConnector;
  };
  mousePosition: Vec2;
}

export type DrawflowNode = {
  centered: boolean;
  connectorSections: Record<string, ConnectorSection>;
  css: SelectableElementCSS;
  customData: SolidDrawflow.CustomDataType;
  readonly display: (props: { node: DrawflowNode }) => Optional<JSX.Element>;
  id: string;
  offset: Vec2;
  position: Vec2;
  ref?: HTMLDivElement;
  resizeObserver?: ResizeObserver;
  size: Vec2;
};

export type ConnectorSection = {
  connectors: Record<string, NodeConnector>;
  css?: string;
  id: string;
  parentNode: DrawflowNode;
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
  destinations: ConnectorDestination[];
  hovered: boolean;
  id: string;
  parentSection: ConnectorSection;
  position: Vec2;
  ref: HTMLDivElement;
  resizeObserver: ResizeObserver;
  size: Vec2;
  sources: ConnectorSource[];
}

export interface ConnectorSource {
  sourceConnector: NodeConnector;
}

export interface ConnectorDestination {
  css: SelectableElementCSS;
  destinationConnector: NodeConnector;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
}
