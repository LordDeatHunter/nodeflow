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
  ref: SignalObject<HTMLDivElement | undefined>;
  position: SignalObject<Position>;
  nodeId: string;
  inputs: SignalObject<Record<string, SignalObject<NodeInput>>>;
  outputs: SignalObject<Record<string, SignalObject<NodeOutput>>>;
  css: SignalObject<string>;
  selectedCss: SignalObject<string>;
}

export interface SignalObject<T> {
  get: () => T;
  set: (value: T | ((prev: T) => void)) => void;
}

export interface NodeInput {
  ref: SignalObject<HTMLDivElement | undefined>;
  connectorId: string;
  position: SignalObject<Position>;
}

export interface NodeOutput {
  ref: SignalObject<HTMLDivElement | undefined>;
  connectorId: string;
  destinations: SignalObject<OutputDestination[]>;
  position: SignalObject<Position>;
}

export interface OutputDestination {
  destinationNodeId?: string;
  destinationInputId?: string;
  css: SignalObject<string>;
}
