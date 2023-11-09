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

// TODO: see if this is necessary
export enum ConnectorTypes {
  Input = "input",
  Output = "output",
}

export type DrawflowNode = {
  connectorSections: Record<string, ConnectorSection>;
  css: NodeCss;
  customData?: CustomDataType;
  readonly display: (nodeId: string) => Optional<JSX.Element>;
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

type NodeConnectorEvent<T> = (
  nodeId: string,
  outputId: string,
) => (event: T) => void;

export interface NodeConnectorEvents {
  onMouseDown?: NodeConnectorEvent<MouseEvent>;
  onTouchStart?: NodeConnectorEvent<TouchEvent>;
  onPointerUp?: NodeConnectorEvent<PointerEvent>;
}

export interface NodeConnector {
  css?: string;
  destinations: ConnectorDestination[];
  events: NodeConnectorEvents;
  hovered: boolean;
  id: string;
  parentSection: ConnectorSection;
  position: Vec2;
  ref: HTMLDivElement;
  size: Vec2;
  sources: ConnectorDestination[];
  type: ConnectorTypes;
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
