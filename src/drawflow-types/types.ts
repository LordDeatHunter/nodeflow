import { JSX } from "solid-js";
import { Vec2 } from "../utils/vec2";

export type Optional<T> = T | undefined;

export interface MouseData {
  clickStartPosition?: Vec2;
  draggingNode: boolean;
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
  customData?: CustomDataType;
  readonly display: (props: { nodeId: string }) => Optional<JSX.Element>;
  id: string;
  offset: Vec2;
  position: Vec2;
  ref?: HTMLDivElement;
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
  zoomLevel: number;
}

export interface SelectableElementCSS {
  normal?: string;
  selected?: string;
}

export interface DrawflowCss {
  newCurve?: string;
}

export interface NodeConnector {
  css?: string;
  destinations: ConnectorDestination[];
  hovered: boolean;
  id: string;
  parentSection: ConnectorSection;
  position: Vec2;
  ref: HTMLDivElement;
  size: Vec2;
  sources: ConnectorSource[];
}

export interface ConnectorSource {
  sourceConnector?: NodeConnector;
}

export interface ConnectorDestination {
  css: SelectableElementCSS;
  destinationConnector?: NodeConnector;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
}
