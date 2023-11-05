import { JSX } from "solid-js";
import { Position } from "../utils/position";
import { Size } from "../utils/size";

export type Optional<T> = T | undefined;

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

// TODO: see if this is necessary
export enum ConnectorTypes {
  Input = "input",
  Output = "output",
}

export type NodeData = {
  connectorSections: Record<string, ConnectorSection>;
  css: NodeCss;
  customData?: CustomDataType;
  readonly display: (nodeId: string) => Optional<JSX.Element>;
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
