export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface MouseData {
  heldNodeId?: string;
  startPosition?: Position;
  dragging: boolean;
  mousePosition: Position;
}

export interface NodeData {
  ref?: HTMLDivElement;
  position: Position;
  nodeId: string;
  inputs: Record<string, NodeInput>;
  outputs: Record<string, NodeOutput>;
  css: NodeCss;
}

export interface NodeCss {
  normal?: string;
  selected?: string;
}

export interface NodeInput {
  ref: HTMLDivElement;
  connectorId: string;
  position: Position;
  size: Size;
}

export interface NodeOutput {
  ref: HTMLDivElement;
  connectorId: string;
  destinations: OutputDestination[];
  position: Position;
  size: Size;
}

export interface OutputDestination {
  destinationNodeId?: string;
  destinationInputId?: string;
  path?: VectorPath;
  css: string;
}

export interface VectorPath {
  path: string;
  start: Position;
  end: Position;
}

export interface SignalObject<T> {
  get: () => T;
  set: (value: T | ((prev: T) => void)) => void;
}
