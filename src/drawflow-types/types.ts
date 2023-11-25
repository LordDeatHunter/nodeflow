import { JSX } from "solid-js";
import { Vec2 } from "../utils/vec2";

export type Optional<T> = T | undefined;

export interface MouseData {
  draggingNode: boolean;
  heldNodeId?: string;
  heldOutputId?: string;
  mousePosition: Vec2;
  startPosition?: Vec2;
}

export type DrawflowNode = {
  connectorSections: Record<string, ConnectorSection>;
  css: NodeCss;
  customData?: CustomDataType;
  readonly display: (props: { nodeId: string }) => Optional<JSX.Element>;
  id: string;
  offset: Vec2;
  position: Vec2;
  ref?: HTMLDivElement;
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

export interface NodeCss {
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
  sources: ConnectorDestination[];
}

export interface ConnectorDestination {
  css: string;
  destinationConnector?: NodeConnector;
  path?: PathData;
}

export interface PathData {
  end: Vec2;
  path: string;
  start: Vec2;
}
