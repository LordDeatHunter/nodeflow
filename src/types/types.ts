export type Optional<T> = T | undefined;

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
  offset: Position;
  nodeId: string;
  inputs: Record<string, NodeInput>;
  outputs: Record<string, NodeOutput>;
  css: NodeCss;
}

export interface NodeCss {
  normal?: string;
  selected?: string;
  inputsSection?: string;
  inputConnector?: string;
  outputsSection?: string;
  outputConnector?: string;
}

interface BaseNodeConnector {
  ref: HTMLDivElement;
  connectorId: string;
  position: Position;
  size: Size;
  hovered: boolean;
}

export interface NodeInput extends BaseNodeConnector {}

export interface NodeOutput extends BaseNodeConnector {
  destinations: OutputDestination[];
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
