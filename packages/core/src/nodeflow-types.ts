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

/**
 * The built-in connector line shapes. Custom shapes can be registered through
 * `registerLineShape` and referenced by their string name.
 */
export type BuiltInLineShape = "curved" | "straight" | "broken-flat-line";

/**
 * Identifies a connector line shape. Includes the built-in shapes while still
 * allowing names registered at runtime.
 */
export type LineShape = BuiltInLineShape | (string & Record<never, never>);

/** The visual dash pattern applied to a connector line. */
export type LineDash = "solid" | "dashed" | "dotted";

export interface SerializedConnection {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css?: SelectableElementCSS;
  shape?: LineShape;
  dash?: LineDash;
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
  shape?: LineShape;
  dash?: LineDash;
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
  /**
   * Shape used for connections that do not specify their own `shape`.
   * Defaults to "curved".
   */
  defaultLineShape: LineShape;
  /**
   * Dash pattern used for connections that do not specify their own `dash`.
   * Defaults to "solid".
   */
  defaultLineDash: LineDash;
  canCreateConnections: boolean;
  canDeleteConnections: boolean;
  canDeleteNodes: boolean;
  canMoveNodes: boolean;
  canPan: boolean;
  canZoom: boolean;
  debugMode: boolean;
  /**
   * Screen-pixel distance from the canvas viewport edge within which a node
   * drag triggers auto-scrolling. 0 requires the pointer to leave the canvas.
   * Values below 0 are treated as 0. Defaults to 0.
   */
  dragEdgeScrollMargin: number;
  /**
   * Screen-pixel speed at which the canvas auto-scrolls when a node is dragged
   * into the margin. Values below 0 are treated as 0 (disabled). Defaults to 10.
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
