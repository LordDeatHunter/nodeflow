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
  mousePosition: Position;
  heldOutputId?: string;
  startPosition?: Position;
}

export interface NodeData {
  css: NodeCss;
  inputs: Record<string, NodeInput>;
  nodeId: string;
  offset: Position;
  outputs: Record<string, NodeOutput>;
  position: Position;
  ref?: HTMLDivElement;
}

export interface DrawflowData {
  currentMoveSpeed: Position;
  position: Position;
  zoomLevel: number;
  pinchDistance: number;
}

export interface NodeCss {
  inputsSection?: string;
  normal?: string;
  outputsSection?: string;
  selected?: string;
}

export interface DrawflowCss {
  newCurve?: string;
}

interface BaseNodeConnector {
  connectorId: string;
  css?: string;
  hovered: boolean;
  position: Position;
  ref: HTMLDivElement;
  size: Size;
}

export interface NodeInput extends BaseNodeConnector {}

export interface NodeOutput extends BaseNodeConnector {
  destinations: OutputDestination[];
}

export interface OutputDestination {
  css: string;
  destinationInputId?: string;
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
