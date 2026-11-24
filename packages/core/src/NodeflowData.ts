import Vec2 from "./Vec2";
import {
  DeepPartial,
  NodeflowSettings,
  SelectableElementType,
  SerializedCompositeDefinition,
  SerializedConnection,
  SerializedNodeflowData,
  SerializedNodeflowGroup,
  SerializedNodeflowNode,
} from "./nodeflow-types";
import NodeflowGroupData from "./NodeflowGroupData";
import NodeTemplates from "./NodeTemplates";
import {
  allocateInnerNodeIds,
  analyzeCompositeSelection,
  CompositeNodeOptions,
  createCompositeSections,
  getCompositePortTargets,
} from "./CompositeNodes";
import { NodeflowEventPublisher, NodeflowEventRecord } from "./EventPublishers";
import { NodeflowDataType, NodeflowNodeType } from "./types";
import { clamp } from "./math-utils";
import Changes from "./Changes";
import MouseData from "./MouseData";
import NodeflowNodeData from "./NodeflowNodeData";
import NodeConnector from "./NodeConnector";
import ConnectorSource from "./ConnectorSource";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorDestination from "./ConnectorDestination";
import { deepCopy, intersectionOfSets, isSetEmpty } from "./misc-utils";
import CurveFunctions from "./CurveFunctions";
import {
  DRAG_EDGE_SCROLL_INTERVAL,
  KEYBOARD_KEY_CODES,
  KeyboardKeyCode,
  MOUSE_BUTTONS,
} from "./constants";
import KeyboardData from "./KeyboardData";
import NodeflowChunking from "./NodeflowChunking";
import Rect from "./Rect";

const touchDistance = (
  first: { pageX: number; pageY: number },
  second: { pageX: number; pageY: number },
): number =>
  Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);

export default class NodeflowData {
  private _currentMoveSpeed: Vec2 = Vec2.zero();
  private _position: Vec2 = Vec2.zero();
  private _startPosition: Vec2 = Vec2.zero();
  private _size: Vec2 = Vec2.zero();
  private _zoomLevel: number = 1;
  private _pinchDistance: number = 0;
  private _intervalId: ReturnType<typeof setInterval> | undefined = undefined;
  private _dragEdgeScrollIntervalId: ReturnType<typeof setInterval> | undefined =
    undefined;
  private _settings: NodeflowSettings;
  /**
   * Unsnapped positions of held nodes, so small drag deltas accumulate across
   * moves instead of being rounded away by grid snapping. `snapped` detects
   * when something else moved the node, which re-seeds `raw`.
   */
  private readonly dragRawPositions = new Map<
    string,
    { raw: Vec2; snapped: Vec2 }
  >();

  public readonly changes: Changes;
  public readonly mouseData: MouseData;
  public readonly keyboardData: KeyboardData;
  public readonly curveFunctions: CurveFunctions;
  public readonly nodes: Map<string, NodeflowNodeData>;
  public readonly eventStore: NodeflowEventRecord;
  public readonly chunking: NodeflowChunking;
  public readonly id: string;
  /** Node groups (frames) by id. Mutate through `addGroup` and friends. */
  public readonly groups = new Map<string, NodeflowGroupData>();
  /** Reusable composite node types. */
  public readonly templates: NodeTemplates;
  /** node id -> id of the group it belongs to. */
  private readonly nodeGroupIndex = new Map<string, string>();

  public static readonly DEFAULT_SETTINGS: NodeflowSettings = {
    allowCollision: false,
    canAddNodes: true,
    canCreateConnections: true,
    canDeleteConnections: true,
    canDeleteNodes: true,
    canMoveNodes: true,
    canPan: true,
    canRenameGroups: true,
    canZoom: true,
    debugMode: false,
    defaultLineDash: "solid",
    defaultLineShape: "curved",
    dragEdgeScrollMargin: 0,
    dragEdgeScrollSpeed: 10,
    gestureMovementThreshold: 6,
    gridSize: 20,
    groupHeaderHeight: 32,
    groupPadding: 16,
    keyboardZoomMultiplier: 15,
    maxMovementSpeed: 15,
    maxZoom: 200,
    minZoom: 0.02,
    movementAcceleration: 1.5,
    movementDeceleration: 0.85,
    snapNodePositionToGrid: false,
    snapNodeSizeToGrid: false,
    virtualization: true,
    virtualizationMargin: 200,
    zoomMultiplier: 0.005,
  } as const;

  public readonly keymap: Record<string, Set<KeyboardKeyCode>> = {
    MOVE_DOWN: new Set([
      KEYBOARD_KEY_CODES.ARROW_DOWN,
      KEYBOARD_KEY_CODES.KEY_S,
    ]),
    MOVE_LEFT: new Set([
      KEYBOARD_KEY_CODES.ARROW_LEFT,
      KEYBOARD_KEY_CODES.KEY_A,
    ]),
    MOVE_RIGHT: new Set([
      KEYBOARD_KEY_CODES.ARROW_RIGHT,
      KEYBOARD_KEY_CODES.KEY_D,
    ]),
    MOVE_UP: new Set([KEYBOARD_KEY_CODES.ARROW_UP, KEYBOARD_KEY_CODES.KEY_W]),
    SELECT_MULTIPLE: new Set([
      KEYBOARD_KEY_CODES.CONTROL_LEFT,
      KEYBOARD_KEY_CODES.CONTROL_RIGHT,
    ]),
    CREATE_SELECTION_BOX: new Set([
      KEYBOARD_KEY_CODES.SHIFT_LEFT,
      KEYBOARD_KEY_CODES.SHIFT_RIGHT,
    ]),
  } as const;

  public constructor(
    id: string,
    settings: Partial<NodeflowSettings> = {},
    curveFunctions?: (nodeflow: NodeflowData) => CurveFunctions,
  ) {
    this.id = id;
    this._settings = { ...NodeflowData.DEFAULT_SETTINGS, ...settings };
    this.constrainView();
    this.curveFunctions = curveFunctions?.(this) ?? new CurveFunctions(this);

    this.changes = new Changes();
    this.mouseData = new MouseData(this);
    this.keyboardData = new KeyboardData(this);
    this.nodes = new Map<string, NodeflowNodeData>();
    this.chunking = new NodeflowChunking(this);
    this.templates = new NodeTemplates(this);

    this.eventStore = {
      onCanvasTransformChanged:
        new NodeflowEventPublisher<"onCanvasTransformChanged">(this),
      onCompositeCreated: new NodeflowEventPublisher<"onCompositeCreated">(
        this,
      ),
      onCompositeExploded:
        new NodeflowEventPublisher<"onCompositeExploded">(this),
      onContentChanged: new NodeflowEventPublisher<"onContentChanged">(this),
      onGroupCollapseToggled:
        new NodeflowEventPublisher<"onGroupCollapseToggled">(this),
      onKeyDownInNodeflow: new NodeflowEventPublisher<"onKeyDownInNodeflow">(
        this,
      ),
      onKeyUpInNodeflow: new NodeflowEventPublisher<"onKeyUpInNodeflow">(this),
      onMouseDownInConnector:
        new NodeflowEventPublisher<"onMouseDownInConnector">(this),
      onMouseDownInGroup: new NodeflowEventPublisher<"onMouseDownInGroup">(
        this,
      ),
      onMouseDownInNode: new NodeflowEventPublisher<"onMouseDownInNode">(this),
      onMouseDownInNodeflow:
        new NodeflowEventPublisher<"onMouseDownInNodeflow">(this),
      onMouseMoveInNodeflow:
        new NodeflowEventPublisher<"onMouseMoveInNodeflow">(this),
      onNodeConnected: new NodeflowEventPublisher<"onNodeConnected">(this),
      onNodeDataChanged: new NodeflowEventPublisher<"onNodeDataChanged">(this),
      onPointerDownInNodeCurve:
        new NodeflowEventPublisher<"onPointerDownInNodeCurve">(this),
      onPointerUpInConnector:
        new NodeflowEventPublisher<"onPointerUpInConnector">(this),
      onPointerUpInNode: new NodeflowEventPublisher<"onPointerUpInNode">(this),
      onPointerUpInNodeflow:
        new NodeflowEventPublisher<"onPointerUpInNodeflow">(this),
      onTemplatesChanged: new NodeflowEventPublisher<"onTemplatesChanged">(
        this,
      ),
      onTouchMoveInNodeflow:
        new NodeflowEventPublisher<"onTouchMoveInNodeflow">(this),
      onTouchEndInNodeflow:
        new NodeflowEventPublisher<"onTouchEndInNodeflow">(this),
      onTouchCancelInNodeflow:
        new NodeflowEventPublisher<"onTouchCancelInNodeflow">(this),
      onTouchStartInConnector:
        new NodeflowEventPublisher<"onTouchStartInConnector">(this),
      onTouchStartInGroup: new NodeflowEventPublisher<"onTouchStartInGroup">(
        this,
      ),
      onTouchStartInNode: new NodeflowEventPublisher<"onTouchStartInNode">(
        this,
      ),
      onTouchStartInNodeflow:
        new NodeflowEventPublisher<"onTouchStartInNodeflow">(this),
      onWheelInNodeflow: new NodeflowEventPublisher<"onWheelInNodeflow">(this),
    };
    this.setupDefaultEventHandlers();
  }

  public handleMovement(): void {
    const movingLeft = !isSetEmpty(
      intersectionOfSets(this.keyboardData.heldKeys, this.keymap.MOVE_LEFT),
    );
    const movingRight = !isSetEmpty(
      intersectionOfSets(this.keyboardData.heldKeys, this.keymap.MOVE_RIGHT),
    );
    const movingUp = !isSetEmpty(
      intersectionOfSets(this.keyboardData.heldKeys, this.keymap.MOVE_UP),
    );
    const movingDown = !isSetEmpty(
      intersectionOfSets(this.keyboardData.heldKeys, this.keymap.MOVE_DOWN),
    );

    const hasSelectedNodes = this.mouseData.heldNodes.length > 0;

    this.currentMoveSpeed = Vec2.of(
      this.calculateDirectionalMovementAmount(
        movingLeft || movingRight,
        this.currentMoveSpeed.x,
        movingRight,
        movingLeft,
        !hasSelectedNodes,
      ),
      this.calculateDirectionalMovementAmount(
        movingUp || movingDown,
        this.currentMoveSpeed.y,
        movingDown,
        movingUp,
        !hasSelectedNodes,
      ),
    );

    if (this.currentMoveSpeed.x === 0 && this.currentMoveSpeed.y === 0) {
      return;
    }

    if (!hasSelectedNodes) {
      this.updateBackgroundPosition(this.currentMoveSpeed, true);
    } else {
      this.updateHeldNodePosition(
        this.currentMoveSpeed.divideBy(this.zoomLevel),
      );
    }
  }

  public serialize(): SerializedNodeflowData {
    return {
      changes: this.changes.serialize(),
      connections: this.serializeConnections(),
      currentMoveSpeed: this.currentMoveSpeed.serialize(),
      mouseData: this.mouseData.serialize(),
      nodes: Object.fromEntries(
        Array.from(this.nodes.entries()).map(([id, node]) => [
          id,
          node.serialize(),
        ]),
      ),
      groups: Object.fromEntries(
        Array.from(this.groups.entries()).map(([id, group]) => [
          id,
          group.serialize(),
        ]),
      ),
      pinchDistance: this.pinchDistance,
      position: this.position.serialize(),
      size: this.size.serialize(),
      startPosition: this.startPosition.serialize(),
      zoomLevel: this.zoomLevel,
    };
  }

  public deserialize(
    data: SerializedNodeflowData,
    hasHistoryGroup: string | boolean = false,
  ) {
    this.update({
      currentMoveSpeed: Vec2.deserializeOrDefault(data.currentMoveSpeed),
      pinchDistance: data.pinchDistance,
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.deserializeOrDefault(data.size),
      startPosition: Vec2.deserializeOrDefault(data.startPosition),
      zoomLevel: data.zoomLevel,
    });

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    this.nodes.clear();
    this.groups.clear();
    this.nodeGroupIndex.clear();
    this.chunking.rebuild();
    this.publishContentChanged();
    Object.values(data.nodes).forEach((node) => {
      this.addNode(node, historyGroup);
    });

    Object.values(data.groups ?? {}).forEach((group) =>
      this.applyGroupState(group.id, group),
    );

    this.mouseData.deserialize(data.mouseData);

    data.connections.forEach((connection) => {
      this.addConnection(connection, historyGroup);
    });

    this.changes.deserialize(data.changes);
  }

  public serializeConnections(): Array<SerializedConnection> {
    return Array.from(this.nodes.values()).flatMap((node) =>
      node.serializeConnections(),
    );
  }

  public get settings(): NodeflowSettings {
    return this._settings;
  }

  public updateSettings(
    settings:
      | Partial<NodeflowSettings>
      | ((prev: NodeflowSettings) => Partial<NodeflowSettings>),
  ) {
    const previous = this._settings;

    if (typeof settings === "function") {
      const updates = settings(this._settings);
      this._settings = { ...this._settings, ...updates };
    } else {
      this._settings = { ...this._settings, ...settings };
    }

    const nodeBoundaryChanged =
      previous.nodeBoundary !== this._settings.nodeBoundary;
    const viewBoundaryChanged =
      previous.viewBoundary !== this._settings.viewBoundary;

    const gridSizeChanged = previous.gridSize !== this._settings.gridSize;
    const positionSnapChanged =
      gridSizeChanged ||
      previous.snapNodePositionToGrid !== this._settings.snapNodePositionToGrid;
    const sizeSnapChanged =
      gridSizeChanged ||
      previous.snapNodeSizeToGrid !== this._settings.snapNodeSizeToGrid;

    if (nodeBoundaryChanged || positionSnapChanged) {
      this.dragRawPositions.clear();
      // clampToBoundary also re-snaps the position to the grid.
      this.nodes.forEach((node) => node.clampToBoundary());
    }

    if (sizeSnapChanged) {
      // Adapters re-apply grid sizing on content changes.
      this.publishContentChanged();
    }

    const viewChanged = this.constrainView();

    if (nodeBoundaryChanged || viewBoundaryChanged || viewChanged) {
      this.publishCanvasTransformChanged();
    }

    if (
      previous.virtualization !== this._settings.virtualization ||
      previous.virtualizationMargin !== this._settings.virtualizationMargin
    ) {
      this.publishContentChanged();
    }
  }

  private get validGridSize(): number | undefined {
    const { gridSize } = this._settings;
    return Number.isFinite(gridSize) && gridSize > 0 ? gridSize : undefined;
  }

  /**
   * Rounds `position` to the nearest grid point when
   * `settings.snapNodePositionToGrid` is on; returns it unchanged otherwise.
   */
  public snapPositionToGrid(position: Vec2): Vec2 {
    const grid = this.validGridSize;
    if (!this._settings.snapNodePositionToGrid || grid === undefined) {
      return position;
    }

    // `+ 0` turns -0 into 0.
    const snap = (value: number): number =>
      Math.round(value / grid) * grid + 0;

    return Vec2.of(snap(position.x), snap(position.y));
  }

  /**
   * Rounds a node's rendered box size up to a multiple of `settings.gridSize`
   * (at least one cell) when `settings.snapNodeSizeToGrid` is on; returns it
   * unchanged otherwise. Adapters use this to size node elements.
   */
  public snapSizeToGrid(size: Vec2): Vec2 {
    const grid = this.validGridSize;
    if (!this._settings.snapNodeSizeToGrid || grid === undefined) {
      return size;
    }

    const snap = (value: number): number =>
      Math.max(1, Math.ceil(value / grid - 1e-6)) * grid;

    return Vec2.of(snap(size.x), snap(size.y));
  }

  /** Forgets the unsnapped positions tracked while dragging nodes. */
  public clearDragState(): void {
    this.dragRawPositions.clear();
  }

  private publishCanvasTransformChanged(): void {
    this.eventStore.onCanvasTransformChanged.publish({
      position: this.position.serialize(),
    });
  }

  /**
   * Notifies subscribers of `onContentChanged`. Called by core whenever it
   * mutates rendered state; call it after mutating that state directly.
   */
  public publishContentChanged(): void {
    this.eventStore.onContentChanged.publish({});
  }

  private static normalizeBoundary(
    rect: Rect | undefined,
  ): { min: Vec2; max: Vec2 } | undefined {
    if (!rect) return undefined;

    const min = rect.startPosition();
    const max = rect.endPosition();

    if (max.x - min.x <= 0 || max.y - min.y <= 0) return undefined;

    return { min, max };
  }

  /**
   * The smallest zoom level the view may reach. Equals `settings.minZoom`
   * unless a `viewBoundary` is set and the canvas has been measured, in which
   * case zooming out is limited so the viewport never grows past the boundary.
   */
  public getEffectiveMinZoom(): number {
    const boundary = NodeflowData.normalizeBoundary(this.settings.viewBoundary);

    if (!boundary || this._size.x <= 0 || this._size.y <= 0) {
      return this.settings.minZoom;
    }

    const fitZoom = Math.max(
      this._size.x / (boundary.max.x - boundary.min.x),
      this._size.y / (boundary.max.y - boundary.min.y),
    );

    return Math.max(this.settings.minZoom, fitZoom);
  }

  /**
   * Clamps zoom and position so the visible viewport stays inside
   * `settings.viewBoundary`. Writes the private fields directly so it can be
   * called from `update()` without recursing. Returns whether anything moved.
   */
  private constrainView(): boolean {
    const boundary = NodeflowData.normalizeBoundary(this.settings.viewBoundary);
    if (!boundary) return false;

    let changed = false;

    if (this._size.x > 0 && this._size.y > 0) {
      const minZoom = Math.min(
        this.getEffectiveMinZoom(),
        this.settings.maxZoom,
      );
      const zoom = clamp(this._zoomLevel, minZoom, this.settings.maxZoom);

      if (zoom !== this._zoomLevel) {
        this._zoomLevel = zoom;
        changed = true;
      }
    }

    const viewSize = this._size.divideBy(this._zoomLevel);

    const clampAxis = (
      value: number,
      min: number,
      max: number,
      visible: number,
    ): number => {
      const low = visible - max;
      const high = -min;

      return low > high ? (low + high) / 2 : clamp(value, low, high);
    };

    const next = Vec2.of(
      clampAxis(this._position.x, boundary.min.x, boundary.max.x, viewSize.x),
      clampAxis(this._position.y, boundary.min.y, boundary.max.y, viewSize.y),
    );

    if (!next.equals(this._position)) {
      this._position = next;
      changed = true;
    }

    return changed;
  }

  public resetMovement = () => {
    this.currentMoveSpeed = Vec2.zero();
    this.clearDragState();
    this.keymap.MOVE_LEFT.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_RIGHT.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_UP.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_DOWN.forEach((key) => this.keyboardData.releaseKey(key));
  };

  get currentMoveSpeed() {
    return this._currentMoveSpeed;
  }

  get position() {
    return this._position;
  }

  get startPosition() {
    return this._startPosition;
  }

  get size() {
    return this._size;
  }

  get zoomLevel() {
    return this._zoomLevel;
  }

  get pinchDistance() {
    return this._pinchDistance;
  }

  get intervalId() {
    return this._intervalId;
  }

  get dragEdgeScrollIntervalId() {
    return this._dragEdgeScrollIntervalId;
  }

  set currentMoveSpeed(value) {
    this._currentMoveSpeed = value;
  }

  set position(value) {
    this.update({ position: value });
  }

  set startPosition(value) {
    this._startPosition = value;
  }

  set size(value) {
    this.update({ size: value });
  }

  public updateCanvasSize(size: Vec2): void {
    this._size = size;

    if (this.constrainView()) {
      this.publishCanvasTransformChanged();
    }
  }

  set zoomLevel(value) {
    this.update({ zoomLevel: value });
  }

  set pinchDistance(value) {
    this._pinchDistance = value;
  }

  set intervalId(value: ReturnType<typeof setInterval> | undefined) {
    this._intervalId = value;
  }

  set dragEdgeScrollIntervalId(
    value: ReturnType<typeof setInterval> | undefined,
  ) {
    this._dragEdgeScrollIntervalId = value;
  }

  public update(data: Partial<NodeflowDataType>) {
    const previousPosition = this._position;
    const previousZoomLevel = this._zoomLevel;

    if (data.currentMoveSpeed !== undefined)
      this._currentMoveSpeed = data.currentMoveSpeed;
    if (data.position !== undefined) this._position = data.position;
    if (data.startPosition !== undefined)
      this._startPosition = data.startPosition;
    if (data.size !== undefined) this._size = data.size;
    if (data.zoomLevel !== undefined) this._zoomLevel = data.zoomLevel;
    if (data.pinchDistance !== undefined)
      this._pinchDistance = data.pinchDistance;
    if (data.intervalId !== undefined) this._intervalId = data.intervalId;

    if (
      data.position !== undefined ||
      data.zoomLevel !== undefined ||
      data.size !== undefined
    ) {
      this.constrainView();
    }

    if (
      !this._position.equals(previousPosition) ||
      this._zoomLevel !== previousZoomLevel
    ) {
      this.publishCanvasTransformChanged();
    }
  }

  public updateWithPrevious(
    updater: (data: NodeflowDataType) => Partial<NodeflowDataType>,
  ) {
    const current: NodeflowDataType = {
      currentMoveSpeed: this._currentMoveSpeed,
      position: this._position,
      startPosition: this._startPosition,
      size: this._size,
      zoomLevel: this._zoomLevel,
      pinchDistance: this._pinchDistance,
      intervalId: this._intervalId,
    };
    this.update(updater(current));
  }

  public center() {
    const windowCenter = this.size.divideBy(2);

    return this.startPosition
      .add(windowCenter)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }

  public calculateDirectionalMovementAmount(
    isMoving: boolean,
    initialSpeed: number,
    positiveMovement: boolean,
    negativeMovement: boolean,
    inverse = false,
  ) {
    let speed = initialSpeed;
    if (isMoving) {
      const change = this.settings.movementAcceleration * (inverse ? -1 : 1);
      speed = clamp(
        speed +
          (positiveMovement ? change : 0) -
          (negativeMovement ? change : 0),
        -this.settings.maxMovementSpeed,
        this.settings.maxMovementSpeed,
      );
    } else {
      speed = clamp(
        speed * this.settings.movementDeceleration,
        -this.settings.maxMovementSpeed,
        this.settings.maxMovementSpeed,
      );
    }
    if (Math.abs(speed) < 0.1) speed = 0;

    return speed;
  }

  public updateZoom = (distance: number, location: Vec2) => {
    const oldZoom = this.zoomLevel;

    if (distance === 0) return;

    const rawZoom =
      distance > 0
        ? oldZoom + oldZoom * distance * this.settings.zoomMultiplier
        : oldZoom / (1 - distance * this.settings.zoomMultiplier);

    // Round before clamping so the result can never dip below the effective
    // minimum (which would let the viewport peek outside a view boundary).
    const newZoom = clamp(
      Number(rawZoom.toFixed(4)),
      Math.min(this.getEffectiveMinZoom(), this.settings.maxZoom),
      this.settings.maxZoom,
    );

    this.mouseData.pointerDown = false;

    const windowDimensions = this.size;
    const centeredZoomLocation = location.subtract(this.startPosition);

    const oldScreenSize = windowDimensions.multiplyBy(oldZoom);
    const newScreenSize = windowDimensions.multiplyBy(newZoom);

    const oldOffset = centeredZoomLocation
      .subtract(oldScreenSize.divideBy(2))
      .divideBy(oldZoom);

    const newOffset = centeredZoomLocation
      .subtract(newScreenSize.divideBy(2))
      .divideBy(newZoom);

    this.updateWithPrevious((prev) => ({
      position: prev.position.subtract(oldOffset).add(newOffset),
      zoomLevel: newZoom,
    }));
  };

  public updateBackgroundPosition(moveDistance: Vec2, keyboard = false) {
    if (
      !this.settings.canPan ||
      !this.mouseData.hasSelectedNodeflow() ||
      keyboard ===
        (this.mouseData.isHoldingButton(MOUSE_BUTTONS.MIDDLE) ||
          this.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)) ||
      this.mouseData.selectionBox.boundingBox
    ) {
      return;
    }

    this.updateWithPrevious((prev) => ({
      position: prev.position.add(moveDistance.divideBy(this.zoomLevel)),
    }));
  }

  public addNode(
    data: Partial<SerializedNodeflowNode>,
    hasHistoryGroup: string | boolean = true,
  ): NodeflowNodeData {
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    const node = NodeflowNodeData.deserialize(this, data, historyGroup);

    this.nodes.set(node.id, node);
    this.publishContentChanged();

    if (historyGroup) {
      const oldConnections = node.serializeConnections();
      const serializedNode = node.serialize();

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          this.addNode(serializedNode, false);

          oldConnections.forEach((connection) => {
            this.addConnection(connection, false);
          });
        },
        undoChange: () => {
          this.removeNode(node.id, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    return node;
  }

  public updateNode(
    nodeId: string,
    data: DeepPartial<NodeflowNodeType>,
    hasHistoryGroup: string | boolean = true,
  ) {
    if (!this.nodes.has(nodeId)) return;

    const node = this.nodes.get(nodeId)!;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const oldNode = this.nodes.get(nodeId)!;
      const serializedNode = oldNode.serialize();
      const oldConnections = oldNode.serializeConnections();

      const oldData = Object.entries(serializedNode).reduce(
        (acc, [key, value]) => {
          if (key in data) {
            Object.assign(acc, { [key]: deepCopy(value) });
          }
          return acc;
        },
        {} as DeepPartial<NodeflowNodeType>,
      );

      this.changes.addChange({
        type: "update",
        source: "node",
        applyChange: () => {
          this.updateNode(nodeId, data, false);
        },
        undoChange: () => {
          this.updateNode(nodeId, oldData, false);
          oldConnections.forEach((connection) => {
            this.addConnection(connection, false);
          });
        },
        historyGroup: historyGroup as string,
      });
    }

    node.updateWithPrevious((prev) => Object.assign({}, prev, data));

    this.eventStore.onNodeDataChanged.publish({ nodeId, data });
  }

  public removeNode(nodeId: string, hasHistoryGroup: string | boolean = true) {
    if (!this.nodes.has(nodeId)) return;

    this.mouseData.selections.deleteNodes((node) => node.id === nodeId);

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const oldNode = this.nodes.get(nodeId)!;
      const oldConnections = oldNode.serializeConnections();

      this.changes.addChange({
        type: "remove",
        source: "node",
        applyChange: () => {
          this.removeNode(nodeId, false);
        },
        undoChange: () => {
          this.addNode(oldNode.serialize(), false);

          oldConnections.forEach((connection) => {
            this.addConnection(connection, false);
          });
        },
        historyGroup: historyGroup as string,
      });
    }

    this.removeIncomingConnections(nodeId);
    this.removeOutgoingConnections(nodeId);
    this.removeNodesFromGroup([nodeId], historyGroup);

    this.chunking.removeNodeFromChunk(nodeId, this.nodes.get(nodeId)!.position);
    this.nodes.delete(nodeId);
    this.publishContentChanged();
  }

  public removeIncomingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.sources.forEach(({ sourceConnector }: ConnectorSource) => {
          sourceConnector.destinations.filterInPlace(
            ({ destinationConnector }: ConnectorDestination) =>
              destinationConnector.parentNode.id !== nodeId,
          );
        });
        connector.sources = new ArrayWrapper<ConnectorSource>();
      });
    });
    this.publishContentChanged();
  }

  public removeOutgoingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.destinations.forEach(
          ({ destinationConnector }: ConnectorDestination) => {
            destinationConnector.sources.filterInPlace(
              ({ sourceConnector }: ConnectorSource) =>
                sourceConnector.parentNode.id !== nodeId,
            );
          },
        );
        connector.destinations = new ArrayWrapper<ConnectorDestination>();
      });
    });
    this.publishContentChanged();
  }

  public getAllSourceConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnectors();
  }

  public getAllDestinationConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnectors();
  }

  public getAllSourceConnections(nodeId: string): SerializedConnection[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnections();
  }

  public getAllDestinationConnections(nodeId: string): SerializedConnection[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnections();
  }

  public getNextFreeNodeId(): string {
    let newId = "0";

    for (let i = 1; this.nodes.has(newId); ++i) {
      newId = i.toString();
    }

    return newId;
  }

  public addConnection(
    data: SerializedConnection,
    hasHistoryGroup: string | boolean = true,
  ) {
    const {
      sourceNodeId,
      sourceConnectorId,
      destinationNodeId,
      destinationConnectorId,
      css,
      shape,
      dash,
    } = data;

    if (!this.nodes.has(sourceNodeId) || !this.nodes.has(destinationNodeId)) {
      return;
    }
    const sourceNode = this.nodes.get(sourceNodeId)!;
    const destinationNode = this.nodes.get(destinationNodeId)!;

    const sourceConnector = sourceNode.getConnector(sourceConnectorId);
    const destinationConnector = destinationNode.getConnector(
      destinationConnectorId,
    );

    if (!sourceConnector || !destinationConnector) {
      return;
    }

    if (
      sourceConnector.destinations.some(
        (destination) =>
          destination.destinationConnector === destinationConnector,
      )
    ) {
      return;
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {

      this.changes.addChange({
        type: "add",
        source: "connection",
        applyChange: () => this.addConnection(data, false),
        undoChange: () =>
          this.removeConnection(
            sourceNodeId,
            sourceConnectorId,
            destinationNodeId,
            destinationConnectorId,
            false,
          ),
        historyGroup: historyGroup as string,
      });
    }

    sourceConnector.destinations.push(
      new ConnectorDestination({
        destinationConnector,
        css: css ?? {},
        shape,
        dash,
      }),
    );

    destinationConnector.sources.push(
      new ConnectorSource({
        sourceConnector,
      }),
    );
    this.publishContentChanged();
  }

  public removeConnection(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
    hasHistoryGroup: string | boolean = true,
  ) {
    if (!this.nodes.has(sourceNodeId) || !this.nodes.has(destinationNodeId)) {
      return;
    }
    const sourceNode = this.nodes.get(sourceNodeId)!;
    const destinationNode = this.nodes.get(destinationNodeId)!;

    const sourceConnector = sourceNode.getConnector(sourceConnectorId);
    const destinationConnector = destinationNode.getConnector(
      destinationConnectorId,
    );

    if (!sourceConnector || !destinationConnector) {
      return;
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const destination = sourceConnector.destinations.find(
        (destination) =>
          destination.destinationConnector.parentNode.id === destinationNodeId,
      );
      const { css, shape, dash } = destination ?? {};

      const undoChange = () => {
        this.addConnection(
          {
            sourceNodeId,
            sourceConnectorId,
            destinationNodeId,
            destinationConnectorId,
            css,
            shape,
            dash,
          },
          false,
        );
      };

      const applyChange = () => {
        this.removeConnection(
          sourceNodeId,
          sourceConnectorId,
          destinationNodeId,
          destinationConnectorId,
          false,
        );
      };

      this.changes.addChange({
        type: "remove",
        source: "connection",
        applyChange,
        undoChange,
        historyGroup: historyGroup as string,
      });
    }

    sourceConnector.destinations.filterInPlace(
      (destination) =>
        destination.destinationConnector.parentNode.id !== destinationNodeId,
    );

    destinationConnector.sources.filterInPlace(
      (source) => source.sourceConnector.parentNode.id !== sourceNodeId,
    );
    this.publishContentChanged();
  }

  /**
   * Moves every held node by `moveSpeed`. With a `nodeBoundary` the delta is
   * shrunk to what *all* held nodes can travel, so a multi-selection stops as
   * a block instead of piling up against the edge. Returns the applied delta.
   */
  public updateHeldNodePosition(moveSpeed: Vec2): Vec2 {
    if (
      !this.settings.canMoveNodes ||
      this.mouseData.selectionBox.boundingBox
    ) {
      return Vec2.zero();
    }

    const heldNodes = this.mouseData.heldNodes as Array<NodeflowNodeData>;
    const rawPositionOf = (node: NodeflowNodeData): Vec2 => {
      const tracked = this.dragRawPositions.get(node.id);
      return tracked && tracked.snapped.equals(node.position)
        ? tracked.raw
        : node.position;
    };

    const delta = this.settings.nodeBoundary
      ? NodeflowData.limitGroupDelta(heldNodes, moveSpeed, rawPositionOf)
      : moveSpeed;

    heldNodes.forEach((node) => {
      const raw = rawPositionOf(node).add(delta);
      node.position = raw;
      this.dragRawPositions.set(node.id, { raw, snapped: node.position });
    });

    return delta;
  }

  private static limitGroupDelta(
    nodes: Array<NodeflowNodeData>,
    delta: Vec2,
    positionOf: (node: NodeflowNodeData) => Vec2,
  ): Vec2 {
    let allowX = Infinity;
    let allowY = Infinity;

    nodes.forEach((node) => {
      const travel = node.getBoundaryTravel();
      if (!travel) return;
      const position = positionOf(node);

      // Nodes too large for the boundary stay pinned and don't block the rest.
      if (travel.high.x >= travel.low.x) {
        allowX = Math.min(
          allowX,
          delta.x > 0
            ? travel.high.x - position.x
            : position.x - travel.low.x,
        );
      }
      if (travel.high.y >= travel.low.y) {
        allowY = Math.min(
          allowY,
          delta.y > 0
            ? travel.high.y - position.y
            : position.y - travel.low.y,
        );
      }
    });

    const limitAxis = (value: number, allowed: number): number =>
      Math.sign(value) * Math.min(Math.abs(value), Math.max(allowed, 0));

    return Vec2.of(limitAxis(delta.x, allowX), limitAxis(delta.y, allowY));
  }

  public setHeldNodePosition(position: Vec2) {
    if (
      !this.settings.canMoveNodes ||
      this.mouseData.selectionBox.boundingBox
    ) {
      return;
    }

    this.mouseData.heldNodes.forEach(
      (element) => (element.position = position),
    );
  }

  private getDragEdgeScrollSpeed(): number {
    return Math.max(this.settings.dragEdgeScrollSpeed, 0);
  }

  private isDraggingNodes(): boolean {
    return (
      this.settings.canMoveNodes &&
      this.mouseData.heldNodes.length > 0 &&
      (this.mouseData.pointerDown ||
        this.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)) &&
      !this.mouseData.selectionBox.boundingBox
    );
  }

  private axisEdgeDirection(value: number, max: number, margin: number): number {
    if (value < margin) return -1;
    if (value > max - margin) return 1;
    return 0;
  }

  public getDragEdgeScrollVector(): Vec2 {
    if (this.size.x <= 0 || this.size.y <= 0) {
      return Vec2.zero();
    }

    const margin = Math.max(this.settings.dragEdgeScrollMargin, 0);
    const relative = this.mouseData.mousePosition.subtract(this.startPosition);

    return Vec2.of(
      this.axisEdgeDirection(relative.x, this.size.x, margin),
      this.axisEdgeDirection(relative.y, this.size.y, margin),
    );
  }

  public updateDragEdgeScroll(): void {
    const vector = this.isDraggingNodes()
      ? this.getDragEdgeScrollVector()
      : Vec2.zero();

    if (
      this.getDragEdgeScrollSpeed() <= 0 ||
      (vector.x === 0 && vector.y === 0)
    ) {
      this.stopDragEdgeScroll();
      return;
    }

    if (this.dragEdgeScrollIntervalId === undefined) {
      this.dragEdgeScrollIntervalId = setInterval(
        () => this.handleDragEdgeScroll(),
        DRAG_EDGE_SCROLL_INTERVAL,
      );
    }
  }

  public handleDragEdgeScroll(): void {
    if (!this.isDraggingNodes()) {
      this.stopDragEdgeScroll();
      return;
    }

    const speed = this.getDragEdgeScrollSpeed();
    const vector = this.getDragEdgeScrollVector();

    if (speed <= 0 || (vector.x === 0 && vector.y === 0)) {
      this.stopDragEdgeScroll();
      return;
    }

    const localDelta = vector.multiplyBy(speed).divideBy(this.zoomLevel);

    // Scroll by the delta the nodes actually moved so a node pinned against a
    // boundary doesn't slide out from under the pointer.
    const applied = this.updateHeldNodePosition(localDelta);
    this.updateWithPrevious((prev) => ({
      position: prev.position.subtract(applied),
    }));
  }

  public stopDragEdgeScroll(): void {
    if (this.dragEdgeScrollIntervalId === undefined) {
      return;
    }

    clearInterval(this.dragEdgeScrollIntervalId);
    this.dragEdgeScrollIntervalId = undefined;
  }

  private setupDefaultEventHandlers() {
    this.eventStore.onNodeConnected.subscribeMultiple([
      {
        name: "nodeflow:create-connection",
        event: (data) =>
          this.addConnection({
            sourceNodeId: data.inputNodeId,
            sourceConnectorId: data.inputId,
            destinationNodeId: data.outputNodeId,
            destinationConnectorId: data.outputId,
          }),
      },
      {
        name: "nodeflow:reset-mouse-data",
        event: () => this.mouseData.reset(),
      },
    ]);

    this.eventStore.onMouseMoveInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:drag-node",
        event: ({ event }) => {
          if (
            this.mouseData.heldNodes.length === 0 ||
            (!this.mouseData.pointerDown &&
              !this.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)) ||
            this.mouseData.selectionBox.boundingBox
          ) {
            return;
          }

          this.updateHeldNodePosition(
            Vec2.of(event.movementX, event.movementY).divideBy(this.zoomLevel),
          );
          this.updateDragEdgeScroll();
        },
      },
      {
        name: "nodeflow:update-background-position",
        event: ({ event }) => {
          const isDraggingNode =
            this.mouseData.heldNodes.length > 0 &&
            (this.mouseData.pointerDown ||
              this.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT));

          if (this.mouseData.selectionBox.boundingBox || isDraggingNode) {
            return;
          }

          this.updateBackgroundPosition(
            Vec2.of(event.movementX, event.movementY),
          );
        },
      },
      {
        name: "nodeflow:expand-selection-box",
        event: ({ event }) => {
          if (!this.mouseData.selectionBox.boundingBox) {
            return;
          }

          this.mouseData.selectionBox.boundingBox = Rect.of(
            this.mouseData.selectionBox.boundingBox.position,
            this.mouseData.selectionBox.boundingBox.position
              .subtract(Vec2.fromEvent(event))
              .negate(),
          );
        },
      },
    ]);

    this.eventStore.onPointerUpInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
      {
        name: "nodeflow:reset-mouse-data",
        event: ({ event }) => {
          this.stopDragEdgeScroll();
          this.clearDragState();
          this.mouseData.pointerDown = false;
          this.mouseData.selectionBox.boundingBox = undefined;
          this.mouseData.heldMouseButtons.delete(event.button);

          if (this.mouseData.heldConnectors.length === 1) {
            this.mouseData.selections.clearNodes();
          }

          this.mouseData.selections.clearConnectors();
        },
      },
    ]);

    this.eventStore.onTouchStartInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
      {
        name: "nodeflow:handle-pinch-start",
        event: ({ event }) => {
          const { touches } = event;
          if (touches.length !== 2) return;

          this.keyboardData.clearKeys();
          this.pinchDistance = touchDistance(touches[0], touches[1]);
          this.mouseData.pinching = true;
          this.mouseData.pointerDown = false;
          this.mouseData.selectionBox.boundingBox = undefined;
          this.mouseData.clearSelections();
        },
      },
      {
        name: "nodeflow:begin-background-gesture",
        event: ({ event }) => {
          const { touches } = event;
          if (touches.length !== 1) return;

          const mousePosition = Vec2.fromEvent(touches[0]);

          this.keyboardData.clearKeys();
          this.mouseData.pinching = false;
          this.mouseData.clearSelections();
          this.mouseData.selectNodeflow();
          this.mouseData.heldMouseButtons.add(MOUSE_BUTTONS.LEFT);
          this.mouseData.update({
            pointerDown: true,
            mousePosition,
            clickStartPosition: Vec2.of(
              mousePosition.x / this.zoomLevel - this.position.x,
              mousePosition.y / this.zoomLevel - this.position.y,
            ),
          });
          this.mouseData.touchStartPosition = mousePosition;
          this.mouseData.touchMoved = false;
        },
      },
    ]);

    this.eventStore.onTouchMoveInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:prevent-scroll",
        event: ({ event }) => event.preventDefault(),
        priority: -1,
      },
      {
        name: "nodeflow:handle-pinch",
        event: ({ event }) => {
          const { touches } = event;
          if (touches.length !== 2) return;

          const currDist = touchDistance(touches[0], touches[1]);
          const centerPosition = Vec2.of(
            (touches[0].pageX + touches[1].pageX) / 2,
            (touches[0].pageY + touches[1].pageY) / 2,
          );

          if (!this.mouseData.pinching) {
            this.mouseData.pinching = true;
            this.mouseData.pointerDown = false;
            this.pinchDistance = currDist;
            return;
          }

          if (this.settings.canZoom) {
            this.updateZoom(currDist - this.pinchDistance, centerPosition);
          }
          this.pinchDistance = currDist;
        },
      },
      {
        name: "nodeflow:handle-touch-drag",
        event: ({ event }) => {
          const { touches } = event;
          if (touches.length !== 1) return;

          const newMousePos = Vec2.fromEvent(touches[0]);

          if (this.mouseData.pinching) {
            this.mouseData.pinching = false;
            this.pinchDistance = 0;
            this.mouseData.mousePosition = newMousePos;
            this.mouseData.touchStartPosition = newMousePos;
            this.mouseData.touchMoved = false;
            return;
          }

          const start = this.mouseData.touchStartPosition;
          if (
            !this.mouseData.touchMoved &&
            start &&
            start.distanceTo(newMousePos) <
              this.settings.gestureMovementThreshold
          ) {
            this.mouseData.mousePosition = newMousePos;
            return;
          }
          this.mouseData.touchMoved = true;

          const moveDistance = newMousePos.subtract(
            this.mouseData.mousePosition,
          );
          this.mouseData.mousePosition = newMousePos;

          if (this.mouseData.heldNodes.length > 0) {
            this.updateHeldNodePosition(moveDistance.divideBy(this.zoomLevel));
            this.updateDragEdgeScroll();
          } else {
            this.updateBackgroundPosition(moveDistance);
          }
        },
      },
    ]);

    this.eventStore.onTouchEndInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:finish-touch-gesture",
        event: ({ event }) => {
          const { touches } = event;

          if (touches.length === 1 && this.mouseData.pinching) {
            const remaining = Vec2.fromEvent(touches[0]);
            this.mouseData.pinching = false;
            this.pinchDistance = 0;
            this.mouseData.mousePosition = remaining;
            this.mouseData.touchStartPosition = remaining;
            this.mouseData.touchMoved = true;
            return;
          }

          if (touches.length !== 0) return;

          this.stopDragEdgeScroll();
          this.clearDragState();
          this.mouseData.pointerDown = false;
          this.mouseData.pinching = false;
          this.mouseData.touchMoved = false;
          this.mouseData.touchStartPosition = undefined;
          this.mouseData.heldMouseButtons.delete(MOUSE_BUTTONS.LEFT);
          this.mouseData.selectionBox.boundingBox = undefined;
        },
      },
    ]);

    this.eventStore.onTouchCancelInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:cancel-touch-gesture",
        event: () => {
          this.stopDragEdgeScroll();
          this.mouseData.reset();
          this.resetMovement();
        },
      },
    ]);


    this.eventStore.onKeyUpInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:remove-held-key",
        event: ({ event }) =>
          this.keyboardData.releaseKey(event.code as KeyboardKeyCode),
      },
    ]);

    this.eventStore.onKeyDownInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:add-held-key",
        event: ({ event }) =>
          this.keyboardData.pressKey(event.code as KeyboardKeyCode),
        priority: 10,
      },
      {
        name: "nodeflow:handle-controls",
        event: ({ event }) => {
          switch (event.code) {
            case KEYBOARD_KEY_CODES.DELETE:
              if (
                this.mouseData.heldNodes.length > 0 &&
                this.settings.canDeleteNodes
              ) {
                const changeGroup = Changes.evaluateHistoryGroup();
                this.mouseData.heldNodes.forEach((element) =>
                  this.removeNode(element.id, changeGroup),
                );
              } else if (
                this.mouseData.heldConnections.length > 0 &&
                this.settings.canDeleteConnections
              ) {
                const changeGroup = Changes.evaluateHistoryGroup();
                this.mouseData.heldConnections.forEach((element) =>
                  this.removeConnection(
                    element.connection.sourceConnector.parentNode.id,
                    element.connection.sourceConnector.id,
                    element.connection.destinationConnector.parentSection
                      .parentNode.id,
                    element.connection.destinationConnector.id,
                    changeGroup,
                  ),
                );
              }
              break;
            case KEYBOARD_KEY_CODES.ESCAPE:
              this.mouseData.clearSelections();
              break;
            case KEYBOARD_KEY_CODES.SPACE:
              if (this.settings.debugMode) {
                if (this.mouseData.selections.size > 0) {
                  console.log(this.mouseData.selections);
                } else {
                  console.log(this.nodes);
                }
              }
              break;
            case KEYBOARD_KEY_CODES.EQUAL:
            case KEYBOARD_KEY_CODES.MINUS:
              if (event.ctrlKey) {
                if (!this.settings.canZoom) return;
                event.preventDefault();
                this.updateZoom(
                  this.settings.keyboardZoomMultiplier *
                    (event.code === KEYBOARD_KEY_CODES.EQUAL ? 1 : -1),
                  this.size.divideBy(2),
                );
              }
              break;
            case KEYBOARD_KEY_CODES.KEY_Z:
              if (!event.ctrlKey) {
                break;
              }
              event.preventDefault();
              if (event.shiftKey) {
                this.changes.redo();
              } else {
                this.changes.undo();
              }
              break;
            case KEYBOARD_KEY_CODES.KEY_A:
            case KEYBOARD_KEY_CODES.KEY_S:
            case KEYBOARD_KEY_CODES.KEY_D:
            case KEYBOARD_KEY_CODES.KEY_W:
            case KEYBOARD_KEY_CODES.ARROW_UP:
            case KEYBOARD_KEY_CODES.ARROW_DOWN:
            case KEYBOARD_KEY_CODES.ARROW_LEFT:
            case KEYBOARD_KEY_CODES.ARROW_RIGHT:
              if (!this.intervalId) {
                this.intervalId = setInterval(() => this.handleMovement(), 10);
              }
          }
        },
      },
    ]);

    this.eventStore.onWheelInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:update-zoom",
        event: ({ event }) => {
          if (!this.settings.canZoom) return;
          this.updateZoom(-event.deltaY, Vec2.fromEvent(event));
        },
      },
      {
        name: "nodeflow:prevent-scroll",
        event: ({ event }) => {
          event.preventDefault();
        },
      },
    ]);

    this.eventStore.onMouseDownInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:reset-movement",
        event: ({ event }) => {
          if (event.button !== MOUSE_BUTTONS.LEFT) return;
          this.resetMovement();
        },
      },
      {
        name: "nodeflow:reset-mouse-data",
        event: ({ event }) => {
          const isAdditiveSelection =
            this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE) &&
            this.keyboardData.isActionPressed(
              this.keymap.CREATE_SELECTION_BOX,
            );

          if (event.button === MOUSE_BUTTONS.LEFT && !isAdditiveSelection) {
            this.mouseData.clearSelections();
          }

          this.mouseData.selectNodeflow();
          this.mouseData.heldMouseButtons.add(event.button);

          this.mouseData.update({
            clickStartPosition: Vec2.of(
              event.clientX / this.zoomLevel - this.position.x,
              event.clientY / this.zoomLevel - this.position.y,
            ),
            mousePosition: Vec2.fromEvent(event),
          });
        },
      },
      {
        name: "nodeflow:create-selection-box",
        event: ({ event }) => {
          if (
            event.button !== MOUSE_BUTTONS.LEFT ||
            !this.keyboardData.isActionPressed(this.keymap.CREATE_SELECTION_BOX)
          ) {
            return;
          }

          this.mouseData.selectionBox.boundingBox = Rect.of(
            Vec2.fromEvent(event),
            Vec2.zero(),
          );
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onMouseDownInConnector.blacklist(
      "nodeflow:allow-pan",
      (data, eventName) =>
        data.event.button !== MOUSE_BUTTONS.LEFT &&
        eventName.startsWith("nodeflow"),
    );
    this.eventStore.onMouseDownInConnector.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "nodeflow:handle-click",
        event: ({ event }) => {
          this.mouseData.heldMouseButtons.add(event.button);
        },
      },
      {
        name: "nodeflow:start-creating-connection",
        event: ({ event, nodeId, connectorId }) => {
          this.mouseData.startCreatingConnection(
            nodeId,
            Vec2.fromEvent(event),
            connectorId,
          );
        },
      },
    ]);

    this.eventStore.onTouchStartInConnector.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
      {
        name: "nodeflow:start-creating-connection",
        event: ({ event, nodeId, connectorId }) => {
          const { clientX: x, clientY: y } = event.touches[0];
          const position = Vec2.of(x, y);
          this.mouseData.pinching = false;
          this.mouseData.touchStartPosition = position;
          this.mouseData.touchMoved = false;
          this.mouseData.startCreatingConnection(nodeId, position, connectorId);
        },
      },
    ]);

    this.eventStore.onPointerUpInConnector.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.preventDefault();
          event.stopPropagation();
        },
        priority: 2,
      },
      {
        name: "nodeflow:connect-held-nodes",
        event: ({ event, nodeId, connectorId }) => {
          if ((event as PointerEvent).pointerType === "touch") return;

          if (
            !this.settings.canCreateConnections ||
            this.mouseData.heldConnectors.length !== 1
          ) {
            return;
          }
          const heldConnector = this.mouseData.heldConnectors[0];
          const heldNode = heldConnector?.parentNode;

          if (!heldConnector || !heldNode) return;

          this.eventStore.onNodeConnected.publish({
            outputNodeId: heldNode.id,
            outputId: heldConnector.id,
            inputNodeId: nodeId,
            inputId: connectorId,
            event,
          });
        },
        priority: 2,
      },
      {
        name: "nodeflow:reset-mouse-data",
        event: () => {
          this.mouseData.pointerDown = false;
        },
        priority: 1,
      },
    ]);

    this.eventStore.onMouseDownInNode.blacklist(
      "nodeflow:allow-pan",
      (data, eventName) =>
        data.event.button !== MOUSE_BUTTONS.LEFT &&
        eventName.startsWith("nodeflow"),
    );
    this.eventStore.onMouseDownInNode.subscribeMultiple([
      {
        name: "nodeflow:select-node",
        event: ({ event, nodeId }) => {
          if (!this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE)) {
            this.mouseData.clearSelections();
          }

          this.mouseData.selectNode(
            nodeId,
            Vec2.fromEvent(event),
            this.settings.canMoveNodes,
          );
        },
      },
      {
        name: "nodeflow:handle-click",
        event: ({ event }) => {
          this.mouseData.heldMouseButtons.add(event.button);
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onTouchStartInNode.subscribeMultiple([
      {
        name: "nodeflow:select-node",
        event: ({ event, nodeId }) => {
          const { clientX: x, clientY: y } = event.touches[0];
          const position = Vec2.of(x, y);
          if (!this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE)) {
            this.mouseData.clearSelections();
          }

          this.mouseData.pinching = false;
          this.mouseData.touchStartPosition = position;
          this.mouseData.touchMoved = false;
          this.mouseData.selectNode(
            nodeId,
            position,
            this.settings.canMoveNodes,
          );
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
    ]);

    this.eventStore.onPointerDownInNodeCurve.blacklist(
      "nodeflow:allow-pan",
      (data, eventName) =>
        data.event.button !== MOUSE_BUTTONS.LEFT &&
        eventName.startsWith("nodeflow"),
    );

    this.eventStore.onPointerDownInNodeCurve.subscribeMultiple([
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.preventDefault();
          event.stopPropagation();
        },
        priority: 1,
      },
      {
        name: "nodeflow:handle-click",
        event: ({ event }) => {
          this.mouseData.heldMouseButtons.add(event.button);
        },
      },
      {
        name: "nodeflow:update-mouse-data",
        event: ({ event, sourceConnector, destinationConnector }) => {
          this.mouseData.pointerDown = true;
          this.mouseData.mousePosition = Vec2.fromEvent(event);

          if (!this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE)) {
            this.mouseData.clearSelections();
          }

          this.mouseData.selections.add({
            type: SelectableElementType.Connection,
            connection: {
              sourceConnector,
              destinationConnector,
            },
          });
        },
      },
    ]);

    this.eventStore.onGroupCollapseToggled.subscribe(
      "nodeflow:toggle-group",
      ({ groupId }) => this.toggleGroupCollapsed(groupId),
    );

    this.eventStore.onMouseDownInGroup.blacklist(
      "nodeflow:allow-pan",
      (data, eventName) =>
        data.event.button !== MOUSE_BUTTONS.LEFT &&
        eventName.startsWith("nodeflow"),
    );
    this.eventStore.onMouseDownInGroup.subscribeMultiple([
      {
        name: "nodeflow:select-group",
        event: ({ event, groupId }) =>
          this.selectGroup(
            groupId,
            Vec2.fromEvent(event),
            this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE),
          ),
      },
      {
        name: "nodeflow:handle-click",
        event: ({ event }) => {
          this.mouseData.heldMouseButtons.add(event.button);
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onTouchStartInGroup.subscribeMultiple([
      {
        name: "nodeflow:select-group",
        event: ({ event, groupId }) => {
          const { clientX: x, clientY: y } = event.touches[0];
          const position = Vec2.of(x, y);

          this.mouseData.pinching = false;
          this.mouseData.touchStartPosition = position;
          this.mouseData.touchMoved = false;
          this.selectGroup(
            groupId,
            position,
            this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE),
          );
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
    ]);

    this.eventStore.onPointerUpInNode.subscribeMultiple([
      {
        name: "nodeflow:reset-mouse-data",
        event: () => {
          this.stopDragEdgeScroll();
          this.clearDragState();
          this.mouseData.pointerDown = false;

          if (this.mouseData.heldConnectors.length === 1) {
            this.mouseData.selections.clearNodes();
          }

          this.mouseData.selections.clearConnectors();
        },
      },
    ]);
  }

  // ─── Composite nodes ──────────────────────────────────────────────────────

  /**
   * Replaces `nodeIds` with one composite node standing in for them. Its
   * inputs and outputs are the selection's unconnected connectors plus those
   * wired to nodes outside the selection (see `analyzeCompositeSelection`);
   * those outside connections are re-attached to the composite. The inner
   * graph is kept on `node.composite`, so `explodeCompositeNode` can restore
   * it. Recorded as one undo step unless `hasHistoryGroup` is false.
   */
  public createCompositeNode(
    nodeIds: Iterable<string>,
    options: CompositeNodeOptions = {},
    hasHistoryGroup: string | boolean = true,
  ): NodeflowNodeData | undefined {
    const analysis = analyzeCompositeSelection(this, nodeIds, options.isInput);
    if (!analysis) return undefined;

    const { origin, external } = analysis;
    let { definition } = analysis;
    const innerIds = Object.keys(definition.nodes);
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    const sharedGroup = this.getSharedGroup(innerIds);

    // Groups lying entirely inside the selection move into the composite.
    // The group all inner nodes share, if any, stays outside and holds it.
    const inner = new Set(innerIds);
    const innerGroups = Array.from(this.groups.values())
      .filter(
        (group) =>
          group !== sharedGroup &&
          Array.from(group.nodeIds).every((id) => inner.has(id)),
      )
      .map((group) => group.serialize());
    if (innerGroups.length > 0) {
      definition = { ...definition, groups: innerGroups };
    }

    // Add the composite first so a group made only of the inner nodes is not
    // deleted for being empty while they are removed.
    const composite = this.addNode(
      {
        position: (options.position ?? origin).serialize(),
        css: options.css,
        customData: options.customData,
        display: options.display,
        connectorSections: createCompositeSections(definition, options),
        composite: definition,
      },
      historyGroup,
    );

    if (sharedGroup) {
      this.addNodesToGroup(sharedGroup.id, [composite.id], historyGroup);
    }

    innerIds.forEach((id) => this.removeNode(id, historyGroup));

    external.forEach(({ connection, side, port }) =>
      this.addConnection(
        side === "input"
          ? {
              ...connection,
              destinationNodeId: composite.id,
              destinationConnectorId: port.id,
            }
          : {
              ...connection,
              sourceNodeId: composite.id,
              sourceConnectorId: port.id,
            },
        historyGroup,
      ),
    );

    this.mouseData.clearSelections();
    this.mouseData.selections.addNode(composite);

    this.eventStore.onCompositeCreated.publish({
      nodeId: composite.id,
      innerNodeIds: innerIds,
    });

    return composite;
  }

  /**
   * Replaces a composite node with its inner nodes, restoring the
   * connections between them and re-attaching every connection of the
   * composite to the inner connector its port maps to. Inner nodes keep
   * their original ids unless those are taken. Returns the restored nodes.
   */
  public explodeCompositeNode(
    nodeId: string,
    hasHistoryGroup: string | boolean = true,
  ): Array<NodeflowNodeData> {
    const composite = this.nodes.get(nodeId);
    const definition = composite?.composite;
    if (!composite || !definition) return [];

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    const origin = composite.position;
    const outerConnections = composite.serializeConnections();
    const group = this.getGroupOfNode(nodeId)?.serialize();
    const ports = [...definition.inputs, ...definition.outputs];

    // Removing the composite first frees its id for an inner node.
    this.removeNode(nodeId, historyGroup);

    const innerIds = Object.keys(definition.nodes);
    const idMap = allocateInnerNodeIds(this, innerIds);

    const restored = innerIds.map((innerId) => {
      const data = definition.nodes[innerId];
      return this.addNode(
        {
          ...data,
          id: idMap.get(innerId),
          position: origin
            .add(Vec2.of(data.position.x, data.position.y))
            .serialize(),
          centered: false,
        },
        historyGroup,
      );
    });

    definition.connections.forEach((connection) =>
      this.addConnection(
        {
          ...connection,
          sourceNodeId: idMap.get(connection.sourceNodeId)!,
          destinationNodeId: idMap.get(connection.destinationNodeId)!,
        },
        historyGroup,
      ),
    );

    // An input port may fan out to several inner connectors.
    const resolvePort = (connectorId: string) => {
      const port = ports.find((candidate) => candidate.id === connectorId);
      if (!port) return [];
      return getCompositePortTargets(port)
        .filter((target) => idMap.has(target.innerNodeId))
        .map((target) => ({
          nodeId: idMap.get(target.innerNodeId)!,
          connectorId: target.innerConnectorId,
        }));
    };

    outerConnections.forEach((connection) => {
      const sources =
        connection.sourceNodeId === nodeId
          ? resolvePort(connection.sourceConnectorId).slice(0, 1)
          : [
              {
                nodeId: connection.sourceNodeId,
                connectorId: connection.sourceConnectorId,
              },
            ];
      const destinations =
        connection.destinationNodeId === nodeId
          ? resolvePort(connection.destinationConnectorId)
          : [
              {
                nodeId: connection.destinationNodeId,
                connectorId: connection.destinationConnectorId,
              },
            ];

      sources.forEach((source) =>
        destinations.forEach((destination) =>
          this.addConnection(
            {
              ...connection,
              sourceNodeId: source.nodeId,
              sourceConnectorId: source.connectorId,
              destinationNodeId: destination.nodeId,
              destinationConnectorId: destination.connectorId,
            },
            historyGroup,
          ),
        ),
      );
    });

    // Inner groups come back; their nodes leave the composite's own group,
    // since a node is in at most one group.
    const innerGroups = (definition.groups ?? [])
      .map((innerGroup) => ({
        ...innerGroup,
        nodeIds: innerGroup.nodeIds
          .filter((id) => idMap.has(id))
          .map((id) => idMap.get(id)!),
      }))
      .filter((innerGroup) => innerGroup.nodeIds.length > 0);
    const innerGrouped = new Set(
      innerGroups.flatMap((innerGroup) => innerGroup.nodeIds),
    );

    if (group) {
      const nodeIds = [
        ...group.nodeIds.filter((id) => id !== nodeId),
        ...restored
          .map((node) => node.id)
          .filter((id) => !innerGrouped.has(id)),
      ];
      // Removing the composite already dropped a group it was alone in.
      if (nodeIds.length > 0) {
        this.commitGroup(group.id, { ...group, nodeIds }, historyGroup);
      }
    }

    innerGroups.forEach(({ nodeIds, ...options }) =>
      this.addGroup(nodeIds, options, historyGroup),
    );

    this.mouseData.clearSelections();
    restored.forEach((node) => this.mouseData.selections.addNode(node));

    this.eventStore.onCompositeExploded.publish({
      compositeNodeId: nodeId,
      nodeIds: restored.map((node) => node.id),
    });

    return restored;
  }

  /**
   * Replaces the inner graph of composite node `nodeId` with `definition`,
   * rebuilding its connector sections from the definition's ports. The node
   * keeps its id, position, css, custom data and group. Outside connections
   * to ports that still exist are kept; the rest are dropped. Recorded as one
   * undo step unless `hasHistoryGroup` is false.
   */
  public updateCompositeNode(
    nodeId: string,
    definition: SerializedCompositeDefinition,
    options: Pick<
      CompositeNodeOptions,
      "inputSection" | "outputSection" | "connectorCss"
    > = {},
    hasHistoryGroup: string | boolean = true,
  ): NodeflowNodeData | undefined {
    const node = this.nodes.get(nodeId);
    if (!node?.composite) return undefined;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    const serialized = node.serialize();
    const connections = node.serializeConnections();
    const group = this.getGroupOfNode(nodeId)?.serialize();
    const wasSelected = this.mouseData.hasSelectedNode(nodeId);

    this.removeNode(nodeId, historyGroup);

    const updated = this.addNode(
      {
        ...serialized,
        centered: false,
        connectorSections: createCompositeSections(definition, options),
        composite: deepCopy(definition),
      },
      historyGroup,
    );

    // Connections are listed from both ends; add each once.
    const seen = new Set<string>();
    connections.forEach((connection) => {
      const key = [
        connection.sourceNodeId,
        connection.sourceConnectorId,
        connection.destinationNodeId,
        connection.destinationConnectorId,
      ].join("|");
      if (seen.has(key)) return;
      seen.add(key);

      const ownConnector =
        connection.sourceNodeId === nodeId
          ? connection.sourceConnectorId
          : connection.destinationConnectorId;
      if (!updated.getConnector(ownConnector)) return;

      this.addConnection(connection, historyGroup);
    });

    if (group) this.commitGroup(group.id, group, historyGroup);
    if (wasSelected) this.mouseData.selections.addNode(updated);

    return updated;
  }

  /**
   * Adds a composite node from a saved template (see `templates`). Its inner
   * nodes are only created if it is broken apart.
   */
  public instantiateTemplate(
    templateId: string,
    position: Vec2,
    options: { centered?: boolean } = {},
    hasHistoryGroup: string | boolean = true,
  ): NodeflowNodeData | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    return this.addNode(
      {
        ...deepCopy(template.node),
        id: undefined,
        position: position.serialize(),
        centered: options.centered ?? false,
        composite: deepCopy(template.definition),
      },
      hasHistoryGroup,
    );
  }

  // ─── Groups ───────────────────────────────────────────────────────────────

  public getGroupOfNode(nodeId: string): NodeflowGroupData | undefined {
    const groupId = this.nodeGroupIndex.get(nodeId);
    return groupId === undefined ? undefined : this.groups.get(groupId);
  }

  /** The collapsed group hiding `nodeId`, if any. */
  public getCollapsedGroupOfNode(
    nodeId: string,
  ): NodeflowGroupData | undefined {
    const group = this.getGroupOfNode(nodeId);
    return group?.collapsed ? group : undefined;
  }

  /** Whether a collapsed group hides `nodeId`. */
  public isNodeHidden(nodeId: string): boolean {
    return this.getCollapsedGroupOfNode(nodeId) !== undefined;
  }

  public getNextFreeGroupId(): string {
    let index = 0;
    while (this.groups.has(`group-${index}`)) ++index;
    return `group-${index}`;
  }

  /**
   * Groups `nodeIds`, taking them out of any group they were in (a node
   * belongs to at most one group).
   */
  public addGroup(
    nodeIds: Iterable<string>,
    options: Partial<Omit<SerializedNodeflowGroup, "nodeIds">> = {},
    hasHistoryGroup: string | boolean = true,
  ): NodeflowGroupData | undefined {
    const ids = Array.from(new Set(nodeIds)).filter((id) =>
      this.nodes.has(id),
    );
    if (ids.length === 0) return undefined;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    const id =
      options.id && !this.groups.has(options.id)
        ? options.id
        : this.getNextFreeGroupId();

    this.removeNodesFromGroup(ids, historyGroup);
    this.commitGroup(
      id,
      {
        id,
        title: options.title ?? "Group",
        nodeIds: ids,
        collapsed: options.collapsed ?? false,
        css: options.css,
        customData: options.customData,
      },
      historyGroup,
    );

    return this.groups.get(id);
  }

  /** Dissolves a group. Its nodes stay where they are. */
  public removeGroup(
    groupId: string,
    hasHistoryGroup: string | boolean = true,
  ): void {
    if (!this.groups.has(groupId)) return;
    this.commitGroup(groupId, undefined, hasHistoryGroup);
  }

  public updateGroup(
    groupId: string,
    data: Partial<Omit<SerializedNodeflowGroup, "id" | "nodeIds">>,
    hasHistoryGroup: string | boolean = true,
  ): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    this.commitGroup(
      groupId,
      { ...group.serialize(), ...deepCopy(data), id: groupId },
      hasHistoryGroup,
    );
  }

  /**
   * Sets a group's title, trimmed. Blank titles and unchanged ones are
   * ignored. Returns whether the title changed.
   */
  public renameGroup(
    groupId: string,
    title: string,
    hasHistoryGroup: string | boolean = true,
  ): boolean {
    const group = this.groups.get(groupId);
    const trimmed = title.trim();
    if (!group || trimmed === "" || trimmed === group.title) return false;
    this.updateGroup(groupId, { title: trimmed }, hasHistoryGroup);
    return true;
  }

  public setGroupCollapsed(
    groupId: string,
    collapsed: boolean,
    hasHistoryGroup: string | boolean = true,
  ): void {
    const group = this.groups.get(groupId);
    if (!group || group.collapsed === collapsed) return;
    this.updateGroup(groupId, { collapsed }, hasHistoryGroup);
  }

  public toggleGroupCollapsed(
    groupId: string,
    hasHistoryGroup: string | boolean = true,
  ): void {
    const group = this.groups.get(groupId);
    if (!group) return;
    this.setGroupCollapsed(groupId, !group.collapsed, hasHistoryGroup);
  }

  public addNodesToGroup(
    groupId: string,
    nodeIds: Iterable<string>,
    hasHistoryGroup: string | boolean = true,
  ): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    const ids = Array.from(new Set(nodeIds)).filter(
      (id) => this.nodes.has(id) && !group.nodeIds.has(id),
    );
    if (ids.length === 0) return;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);
    this.removeNodesFromGroup(ids, historyGroup);

    const current = this.groups.get(groupId)!.serialize();
    this.commitGroup(
      groupId,
      { ...current, nodeIds: [...current.nodeIds, ...ids] },
      historyGroup,
    );
  }

  /** Takes nodes out of their groups; groups left empty are removed. */
  public removeNodesFromGroup(
    nodeIds: Iterable<string>,
    hasHistoryGroup: string | boolean = true,
  ): void {
    const byGroup = new Map<string, Set<string>>();

    for (const nodeId of nodeIds) {
      const groupId = this.nodeGroupIndex.get(nodeId);
      if (groupId === undefined) continue;
      if (!byGroup.has(groupId)) byGroup.set(groupId, new Set());
      byGroup.get(groupId)!.add(nodeId);
    }
    if (byGroup.size === 0) return;

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    byGroup.forEach((removed, groupId) => {
      const group = this.groups.get(groupId);
      if (!group) return;

      const current = group.serialize();
      const remaining = current.nodeIds.filter((id) => !removed.has(id));
      this.commitGroup(
        groupId,
        remaining.length > 0 ? { ...current, nodeIds: remaining } : undefined,
        historyGroup,
      );
    });
  }

  /** Selects every member of a group, ready to be dragged as one. */
  public selectGroup(
    groupId: string,
    position: Vec2 = Vec2.zero(),
    additive = false,
  ): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    if (!additive) this.mouseData.clearSelections();

    group.members.forEach((node) => {
      if (!this.mouseData.hasSelectedNode(node.id)) {
        this.mouseData.selections.addNode(node);
      }
    });

    this.mouseData.update({
      pointerDown: this.settings.canMoveNodes,
      mousePosition: position,
    });
  }

  /** The group every one of `nodeIds` belongs to, if they share one. */
  private getSharedGroup(
    nodeIds: Array<string>,
  ): NodeflowGroupData | undefined {
    const groupIds = new Set(
      nodeIds.map((nodeId) => this.nodeGroupIndex.get(nodeId)),
    );
    if (groupIds.size !== 1) return undefined;

    const [groupId] = groupIds;
    return groupId === undefined ? undefined : this.groups.get(groupId);
  }

  /**
   * Sets a group's state (`undefined` removes it), recording the previous
   * state for undo. Every group mutation goes through here.
   */
  private commitGroup(
    groupId: string,
    next: SerializedNodeflowGroup | undefined,
    hasHistoryGroup: string | boolean,
  ): void {
    const previous = this.groups.get(groupId)?.serialize();
    const snapshot = deepCopy(next);
    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      this.changes.addChange({
        type: !previous ? "add" : snapshot ? "update" : "remove",
        source: "group",
        applyChange: () => this.applyGroupState(groupId, snapshot),
        undoChange: () => this.applyGroupState(groupId, previous),
        historyGroup: historyGroup as string,
      });
    }

    this.applyGroupState(groupId, snapshot);
  }

  private applyGroupState(
    groupId: string,
    state: SerializedNodeflowGroup | undefined,
  ): void {
    const existing = this.groups.get(groupId);

    existing?.nodeIds.forEach((nodeId) => {
      if (this.nodeGroupIndex.get(nodeId) === groupId) {
        this.nodeGroupIndex.delete(nodeId);
      }
    });

    if (!state) {
      this.groups.delete(groupId);
    } else {
      const group = existing ?? new NodeflowGroupData(this, state);
      group.apply(state);
      this.groups.set(groupId, group);
      state.nodeIds.forEach((nodeId) =>
        this.nodeGroupIndex.set(nodeId, groupId),
      );
    }

    this.publishContentChanged();
  }

  // ─── Rendering helpers ────────────────────────────────────────────────────

  /**
   * Ids of the nodes adapters should mount, in insertion order: those
   * `getVisibleNodeIds` reports (all with virtualization off), minus nodes
   * hidden inside collapsed groups.
   */
  public getRenderedNodeIds(): Array<string> {
    const visible = this.getVisibleNodeIds();
    const out: Array<string> = [];

    for (const id of this.nodes.keys()) {
      if (visible ? visible.has(id) : !this.isNodeHidden(id)) out.push(id);
    }

    return out;
  }

  /** Whether a connection runs entirely inside one collapsed group. */
  public isConnectionHidden(
    sourceNodeId: string,
    destinationNodeId: string,
  ): boolean {
    const group = this.getCollapsedGroupOfNode(sourceNodeId);
    return (
      group !== undefined &&
      group === this.getCollapsedGroupOfNode(destinationNodeId)
    );
  }

  /**
   * Where a connection's line should start and end, and the node centers
   * that orient it. An end whose node is hidden in a collapsed group attaches
   * to that group's box, on the side facing the other end.
   */
  public getConnectionEndpoints(
    sourceConnector: NodeConnector,
    destinationConnector: NodeConnector,
  ): { start: Vec2; end: Vec2; startAnchor: Vec2; endAnchor: Vec2 } {
    const sourceNode = sourceConnector.parentNode as NodeflowNodeData;
    const destinationNode =
      destinationConnector.parentNode as NodeflowNodeData;

    const sourceBox = this.getCollapsedGroupOfNode(
      sourceNode.id,
    )?.getCollapsedRect();
    const destinationBox = this.getCollapsedGroupOfNode(
      destinationNode.id,
    )?.getCollapsedRect();

    const startReference = sourceBox?.center ?? sourceConnector.getCenter();
    const endReference =
      destinationBox?.center ?? destinationConnector.getCenter();

    return {
      start: sourceBox
        ? NodeflowData.pointOnRectToward(sourceBox, endReference)
        : startReference,
      end: destinationBox
        ? NodeflowData.pointOnRectToward(destinationBox, startReference)
        : endReference,
      startAnchor: sourceBox?.center ?? sourceNode.getCenter(),
      endAnchor: destinationBox?.center ?? destinationNode.getCenter(),
    };
  }

  /**
   * Where the segment from `rect`'s center toward `target` crosses the
   * rect's border; `target` itself when it lies inside.
   */
  public static pointOnRectToward(rect: Rect, target: Vec2): Vec2 {
    const center = rect.center;
    const direction = target.subtract(center);
    if (direction.x === 0 && direction.y === 0) return center;

    const halfWidth = Math.abs(rect.size.x) / 2;
    const halfHeight = Math.abs(rect.size.y) / 2;
    const scale = Math.min(
      direction.x === 0 ? Infinity : halfWidth / Math.abs(direction.x),
      direction.y === 0 ? Infinity : halfHeight / Math.abs(direction.y),
      1,
    );

    return center.add(direction.multiplyBy(scale));
  }

  public selectNode(nodeId: string, position?: Vec2) {
    this.mouseData.selectNode(nodeId, position ?? Vec2.zero(), false);
  }

  /**
   * The canvas-space rectangle currently visible in the viewport, or
   * `undefined` before the adapter has measured the canvas.
   */
  public getVisibleRect(): Rect | undefined {
    if (this._size.x <= 0 || this._size.y <= 0) return undefined;

    return Rect.of(
      Vec2.zero().subtract(this._position),
      this._size.divideBy(this._zoomLevel),
    );
  }

  /**
   * Ids of the nodes an adapter should keep in the DOM: those overlapping the
   * viewport grown by `settings.virtualizationMargin` screen pixels, plus any
   * node that is selected or owns a held connector, so in-progress drags and
   * connections never lose their element. Before the adapter has measured
   * the canvas nothing counts as visible, so a large graph is not mounted in
   * full only to be unmounted a frame later. Returns `undefined` (render every
   * node) when `settings.virtualization` is off.
   */
  public getVisibleNodeIds(): Set<string> | undefined {
    if (!this.settings.virtualization) return undefined;

    const ids = new Set<string>();
    const view = this.getVisibleRect();
    if (!view) return ids;

    const margin = Vec2.of(1, 1).multiplyBy(
      Math.max(0, this.settings.virtualizationMargin) / this._zoomLevel,
    );
    const area = Rect.fromPositions(
      view.startPosition().subtract(margin),
      view.endPosition().add(margin),
    );

    this.chunking.getNodesInRect(area).forEach((node) => ids.add(node.id));
    this.mouseData.heldNodes.forEach((node: NodeflowNodeData) =>
      ids.add(node.id),
    );
    this.mouseData.heldConnectors.forEach((connector: NodeConnector) =>
      ids.add(connector.parentNode.id),
    );

    // Members of collapsed groups are drawn as the group's box instead.
    ids.forEach((id) => {
      if (this.isNodeHidden(id)) ids.delete(id);
    });

    return ids;
  }

  public transformVec2ToCanvas(position: Vec2) {
    return position
      .subtract(this.startPosition)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }
}
