import {
  Change,
  DisplayFunc,
  SelectableElementCSS,
  SelectableElementType,
} from "./types";

export interface SerializedVec2 {
  x: number;
  y: number;
}

export interface SerializedChanges {
  changes: Array<Change>;
  currentChangeIndex: number;
  maxChanges: number;
}

export interface SerializedNodeflowData {
  changes: SerializedChanges;
  connections: Array<SerializedConnection>;
  currentMoveSpeed: SerializedVec2;
  mouseData: SerializedMouseData;
  nodes: Record<string, SerializedNodeflowNode>;
  pinchDistance: number;
  position: SerializedVec2;
  size: SerializedVec2;
  startPosition: SerializedVec2;
  zoomLevel: number;
}

export interface SerializedMouseData {
  clickStartPosition?: SerializedVec2;
  selections: Record<string, SerializedSelectableElement>;
}

export type SerializedSelectableElement =
  | {
      connectorId: string;
      nodeId: string;
      type: SelectableElementType.Connector;
    }
  | {
      nodeId: string;
      type: SelectableElementType.Node;
    }
  | {
      type: SelectableElementType.Nodeflow;
    }
  | {
      connection: SerializedConnection;
      type: SelectableElementType.Connection;
    };

export interface SerializedNodeflowNode {
  centered: boolean;
  connectorSections: Record<string, SerializedConnectorSection>;
  css: SelectableElementCSS;
  customData: CustomNodeflowDataType;
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
