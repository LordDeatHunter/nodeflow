import { JSX } from "solid-js";

export type Optional<T> = T | undefined;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  height: number;
  width: number;
}

export interface MouseData {
  draggingNode: boolean;
  heldNodeId?: string;
  heldOutputId?: string;
  mousePosition: Position;
  startPosition?: Position;
}

export type ConnectorSection = {
  connectors: Record<string, NodeConnector>;
  css?: string;
  id: string;
};

export enum ConnectorTypes {
  Input = "input",
  Output = "output",
}

export type NodeData = {
  connectorSections: Record<string, ConnectorSection>;
  css: NodeCss;
  customData?: CustomDataType;
  readonly display: (nodeId: string) => JSX.Element | undefined;
  nodeId: string;
  offset: Position;
  position: Position;
  ref?: HTMLDivElement;
};

export interface DrawflowData {
  currentMoveSpeed: Position;
  pinchDistance: number;
  position: Position;
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
  connectorId: string;
  css?: string;
  // TODO: consider making relations go both ways
  destinations: ConnectorDestination[];
  events: NodeConnectorEvents;
  hovered: boolean;
  position: Position;
  ref: HTMLDivElement;
  size: Size;
  type: ConnectorTypes;
}

export interface ConnectorDestination {
  css: string;
  destinationConnectorId?: string;
  destinationNodeId?: string;
  path?: PathData;
}

export interface PathData {
  end: Position;
  path: string;
  start: Position;
}

export interface SignalObject<T> {
  get: () => T;
  set: (value: T | ((prev: T) => void)) => void;
}
