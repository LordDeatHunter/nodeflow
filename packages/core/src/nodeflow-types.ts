export type Optional<T> = T | undefined;

export type DeepPartial<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
    }
  : T;

export interface SerializedVec2 {
  x: number;
  y: number;
}

export interface SerializedChanges {
  changes: Array<Change>;
  currentChangeIndex: number;
  maxChanges: number;
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

export interface SelectableElementCSS {
  normal?: string;
  selected?: string;
}

export interface PathData {
  end: SerializedVec2;
  path: string;
  start: SerializedVec2;
  anchorStart: SerializedVec2;
  anchorEnd: SerializedVec2;
}

export interface ConnectorSourceType {
  sourceConnector: any;
}

export interface ConnectorDestinationType {
  css: SelectableElementCSS;
  destinationConnector: any;
  path?: PathData;
}

export type Change = {
  type: "add" | "remove" | "update";
  source: string;
  applyChange: () => void;
  undoChange: () => void;
  historyGroup: string;
};

export type NodeflowSettings = {
  allowCollision: boolean;
  canAddNodes: boolean;
  canCreateConnections: boolean;
  canDeleteConnections: boolean;
  canDeleteNodes: boolean;
  canMoveNodes: boolean;
  canPan: boolean;
  canZoom: boolean;
  debugMode: boolean;
  /**
   * Screen-pixel speed at which the canvas auto-scrolls when a node is dragged
   * into the viewport edge band. Values below 0 are treated as 0 (disabled).
   * Defaults to 1.
   */
  dragEdgeScrollSpeed: number;
  /** Minimum finger travel (px) before a touch is treated as a drag/pan instead of a tap. */
  gestureMovementThreshold: number;
  keyboardZoomMultiplier: number;
  maxMovementSpeed: number;
  maxZoom: number;
  minZoom: number;
  movementAcceleration: number;
  movementDeceleration: number;
  zoomMultiplier: number;
};

export enum SelectableElementType {
  Connector = "connector",
  Node = "node",
  Nodeflow = "nodeflow",
  Connection = "connection",
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

export interface SerializedMouseData {
  clickStartPosition?: SerializedVec2;
  selections: Record<string, SerializedSelectableElement>;
}

export interface SerializedNodeflowNode {
  centered: boolean;
  connectorSections: Record<string, SerializedConnectorSection>;
  css: SelectableElementCSS;
  customData: CustomNodeflowDataType;
  display: any;
  id: string;
  position: SerializedVec2;
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
