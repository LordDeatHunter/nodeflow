import type Rect from "./Rect";

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
  /**
   * Canvas-space size (px) of one grid cell, used by `snapNodePositionToGrid`
   * and `snapNodeSizeToGrid`. Values of 0 or below disable snapping.
   * Defaults to 20.
   */
  gridSize: number;
  keyboardZoomMultiplier: number;
  maxMovementSpeed: number;
  maxZoom: number;
  minZoom: number;
  movementAcceleration: number;
  movementDeceleration: number;
  /**
   * Optional canvas-space rectangle that nodes are kept inside. A node's
   * rendered box (`position` to `position + size + 2 * offset`) is clamped so
   * it never leaves the rectangle; nodes larger than the rectangle pin to its
   * top-left corner. `undefined` (default) leaves node placement unbounded.
   */
  nodeBoundary?: Rect;
  /**
   * When true, node positions are rounded to the nearest multiple of
   * `gridSize`. Dragging accumulates the unsnapped position, so nodes step
   * from cell to cell. `nodeBoundary` takes precedence over the grid.
   * Defaults to false.
   */
  snapNodePositionToGrid: boolean;
  /**
   * When true, adapters grow each node's rendered box (border included) so
   * its width and height are multiples of `gridSize` (at least one cell).
   * Defaults to false.
   */
  snapNodeSizeToGrid: boolean;
  /**
   * Optional canvas-space rectangle that the visible viewport is kept inside.
   * Panning stops at the edges and zooming out is limited so the viewport never
   * extends past the rectangle (effective min zoom = max(`minZoom`,
   * viewportSize / boundarySize)). `undefined` (default) leaves the view
   * unbounded.
   */
  viewBoundary?: Rect;
  /**
   * When true (default), adapters only mount DOM elements for nodes near the
   * viewport (see `NodeflowData.getVisibleNodeIds`). Nodes scrolled out of
   * view are unmounted, so state held only inside a node's DOM (focus, an
   * uncontrolled input) is lost; keep such state in `customData` or disable
   * this.
   */
  virtualization: boolean;
  /**
   * Screen-pixel distance past each viewport edge within which nodes stay
   * mounted when `virtualization` is on, so panning does not reveal empty
   * space before nodes mount. Defaults to 200.
   */
  virtualizationMargin: number;
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
  offset: SerializedVec2;
  position: SerializedVec2;
  size: SerializedVec2;
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
