export interface Position {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export interface HeldNode {
  nodeId?: string;
  position: Position;
}
export interface NodeData {
  ref: SignalObject<HTMLDivElement | undefined>;
  position: SignalObject<Position>;
  nodeId: string;
  inputs: SignalObject<Record<string, SignalObject<NodeInput>>>;
  outputs: SignalObject<Record<string, SignalObject<NodeOutput>>>;
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
  destinationNodeId?: string;
  destinationInputId?: string;
  position: SignalObject<Position>;
  curveProps?: SignalObject<ModifiableCurveProps>;
}

export interface ModifiableCurveProps {
  strokeWeight?: SignalObject<number>;
  lineColor?: SignalObject<string>;
}
