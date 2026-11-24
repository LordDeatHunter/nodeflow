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
  /**
   * Whether a group's title can be renamed in place by double-clicking it.
   * Defaults to true.
   */
  canRenameGroups: boolean;
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
  /**
   * Canvas-space padding between a group's members and its frame.
   * Defaults to 16.
   */
  groupPadding: number;
  /** Canvas-space height of an expanded group's header bar. Defaults to 32. */
  groupHeaderHeight: number;
  /**
   * Supplies `display` for nodes added without one, e.g. nodes restored from
   * JSON (templates, saved graphs), since components cannot be stored.
   */
  resolveNodeDisplay?: (node: Partial<SerializedNodeflowNode>) => unknown;
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
  /**
   * Set on composite nodes: the inner graph the node stands in for. See
   * `NodeflowData.createCompositeNode`.
   */
  composite?: SerializedCompositeDefinition;
}

/** An inner connector of a composite node. */
export interface CompositePortTarget {
  innerNodeId: string;
  innerConnectorId: string;
}

/** Maps one connector of a composite node to the inner connector it exposes. */
export interface CompositePort extends CompositePortTarget {
  /** Connector id on the composite node. */
  id: string;
  /**
   * Input ports only: further inner connectors fed by this port (fan-out),
   * besides `innerNodeId`/`innerConnectorId`.
   */
  extraTargets?: Array<CompositePortTarget>;
  /** Optional label for the port, e.g. "a" or "positive solution". */
  name?: string;
}

/**
 * The inner graph of a composite node. Node positions are relative to the
 * composite node's position.
 */
export interface SerializedCompositeDefinition {
  nodes: Record<string, SerializedNodeflowNode>;
  /** Connections between inner nodes. */
  connections: Array<SerializedConnection>;
  inputs: Array<CompositePort>;
  outputs: Array<CompositePort>;
}

/** A reusable composite node type. Plain JSON once `display` is stripped. */
export interface NodeTemplate {
  id: string;
  name: string;
  definition: SerializedCompositeDefinition;
  /** What spawned nodes are created with, minus position and `composite`. */
  node: Partial<SerializedNodeflowNode>;
}

export interface NodeflowGroupCss {
  /** Expanded frame. */
  frame?: string;
  /** Expanded frame's header bar. */
  header?: string;
  /** Collapsed box. */
  collapsed?: string;
  /** Added to the frame or box while every member is selected. */
  selected?: string;
}

export interface SerializedNodeflowGroup {
  id: string;
  title: string;
  nodeIds: Array<string>;
  collapsed: boolean;
  css?: NodeflowGroupCss;
  customData?: Record<string, unknown>;
}

export interface SerializedNodeflowData {
  changes: SerializedChanges;
  connections: Array<SerializedConnection>;
  currentMoveSpeed: SerializedVec2;
  mouseData: SerializedMouseData;
  nodes: Record<string, SerializedNodeflowNode>;
  /** Absent in data saved before groups existed. */
  groups?: Record<string, SerializedNodeflowGroup>;
  pinchDistance: number;
  position: SerializedVec2;
  size: SerializedVec2;
  startPosition: SerializedVec2;
  zoomLevel: number;
}
