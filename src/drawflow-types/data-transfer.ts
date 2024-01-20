import { Change, DisplayFunc, SelectableElementCSS } from "./types";

export interface SerializedVec2 {
  x: number;
  y: number;
}

export interface SerializedChanges {
  changes: Array<Change>;
  currentChangeIndex: number;
}

export interface SerializedDrawflow {
  changes: SerializedChanges;
  connections: Array<SerializedConnection>;
  currentMoveSpeed: SerializedVec2;
  mouseData: SerializedMouseData;
  nodes: Record<string, SerializedDrawflowNode>;
  pinchDistance: number;
  position: SerializedVec2;
  size: SerializedVec2;
  startPosition: SerializedVec2;
  zoomLevel: number;
}

export interface SerializedMouseData {
  clickStartPosition?: SerializedVec2;
  heldConnection?: {
    sourceNodeId: string;
    sourceConnectorId: string;
    destinationNodeId: string;
    destinationConnectorId: string;
  };
  heldConnectorId?: string;
  heldNodeId?: string;
}

export interface SerializedDrawflowNode {
  centered: boolean;
  connectorSections: Record<string, SerializedConnectorSection>;
  css: SelectableElementCSS;
  customData: Nodeflow.CustomDataType;
  display: DisplayFunc; // TODO: find a way to serialize this
  id: string;
  position: SerializedVec2;
}

export interface SerializedConnectorSection {
  connectors: Record<string, SerializedNodeConnector>;
  css?: string;
  id: string;
}

export interface SerializedNodeConnector {
  css?: string;
  hovered: boolean;
  id: string;
  position: SerializedVec2;
}

export interface SerializedConnection {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css?: SelectableElementCSS;
}
