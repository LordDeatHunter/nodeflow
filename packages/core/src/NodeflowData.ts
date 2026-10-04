import Vec2 from "./Vec2";
import {
  DeepPartial,
  NodeflowSettings,
  Optional,
  SelectableElementType,
  SerializedConnection,
  SerializedNodeflowData,
  SerializedNodeflowNode,
} from "./nodeflow-types";
import { NodeflowEventRecord } from "./EventPublishers";
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
import { NodeflowEventPublisher } from "./EventPublishers";
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

  public readonly changes: Changes;
  public readonly mouseData: MouseData;
  public readonly keyboardData: KeyboardData;
  public readonly curveFunctions: CurveFunctions;
  public readonly nodes: Map<string, NodeflowNodeData>;
  public readonly eventStore: NodeflowEventRecord;
  public readonly chunking: NodeflowChunking;
  public readonly id: string;

  public static readonly DEFAULT_SETTINGS: NodeflowSettings = {
    allowCollision: false,
    canAddNodes: true,
    canCreateConnections: true,
    canDeleteConnections: true,
    canDeleteNodes: true,
    canMoveNodes: true,
    canPan: true,
    canZoom: true,
    debugMode: false,
    defaultLineDash: "solid",
    defaultLineShape: "curved",
    dragEdgeScrollMargin: 0,
    dragEdgeScrollSpeed: 10,
    gestureMovementThreshold: 6,
    keyboardZoomMultiplier: 15,
    maxMovementSpeed: 15,
    maxZoom: 200,
    minZoom: 0.02,
    movementAcceleration: 1.5,
    movementDeceleration: 0.85,
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
    this.curveFunctions = curveFunctions?.(this) ?? new CurveFunctions(this);

    this.changes = new Changes();
    this.mouseData = new MouseData(this);
    this.keyboardData = new KeyboardData(this);
    this.nodes = new Map<string, NodeflowNodeData>();
    this.chunking = new NodeflowChunking(this);

    this.eventStore = {
      onCanvasTransformChanged:
        new NodeflowEventPublisher<"onCanvasTransformChanged">(this),
      onKeyDownInNodeflow: new NodeflowEventPublisher<"onKeyDownInNodeflow">(
        this,
      ),
      onKeyUpInNodeflow: new NodeflowEventPublisher<"onKeyUpInNodeflow">(this),
      onMouseDownInConnector:
        new NodeflowEventPublisher<"onMouseDownInConnector">(this),
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
      onTouchMoveInNodeflow:
        new NodeflowEventPublisher<"onTouchMoveInNodeflow">(this),
      onTouchEndInNodeflow:
        new NodeflowEventPublisher<"onTouchEndInNodeflow">(this),
      onTouchCancelInNodeflow:
        new NodeflowEventPublisher<"onTouchCancelInNodeflow">(this),
      onTouchStartInConnector:
        new NodeflowEventPublisher<"onTouchStartInConnector">(this),
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
    Object.values(data.nodes).forEach((node) => {
      this.addNode(node, historyGroup);
    });

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
    if (typeof settings === "function") {
      const updates = settings(this._settings);
      this._settings = { ...this._settings, ...updates };
    } else {
      this._settings = { ...this._settings, ...settings };
    }
  }

  public resetMovement = () => {
    this.currentMoveSpeed = Vec2.zero();
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
    this._position = value;
  }

  set startPosition(value) {
    this._startPosition = value;
  }

  set size(value) {
    this._size = value;
  }

  public updateCanvasSize(size: Vec2): void {
    this._size = size;
  }

  set zoomLevel(value) {
    this._zoomLevel = value;
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

    const newZoom = Number(
      clamp(
        distance > 0
          ? oldZoom + oldZoom * distance * this.settings.zoomMultiplier
          : oldZoom / (1 - distance * this.settings.zoomMultiplier),
        this.settings.minZoom,
        this.settings.maxZoom,
      ).toFixed(4),
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

    if (historyGroup) {
      const oldConnections = node.serializeConnections();
      const serializedNode = node.serialize();
      const nodeflowData = this;

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          nodeflowData.addNode(serializedNode, false);

          oldConnections.forEach((connection) => {
            nodeflowData.addConnection(connection, false);
          });
        },
        undoChange: () => {
          nodeflowData.removeNode(node.id, false);
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
      const nodeflowData = this;

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
          nodeflowData.updateNode(nodeId, data, false);
        },
        undoChange: () => {
          nodeflowData.updateNode(nodeId, oldData, false);
          oldConnections.forEach((connection) => {
            nodeflowData.addConnection(connection, false);
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
      const nodeflowData = this;

      this.changes.addChange({
        type: "remove",
        source: "node",
        applyChange: () => {
          nodeflowData.removeNode(nodeId, false);
        },
        undoChange: () => {
          nodeflowData.addNode(oldNode.serialize(), false);

          oldConnections.forEach((connection) => {
            nodeflowData.addConnection(connection, false);
          });
        },
        historyGroup: historyGroup as string,
      });
    }

    this.removeIncomingConnections(nodeId);
    this.removeOutgoingConnections(nodeId);

    this.nodes.delete(nodeId);
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
      const nodeflowData = this;

      this.changes.addChange({
        type: "add",
        source: "connection",
        applyChange: () => nodeflowData.addConnection(data, false),
        undoChange: () =>
          nodeflowData.removeConnection(
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
      const nodeflowData = this;

      const undoChange = () => {
        nodeflowData.addConnection(
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
        nodeflowData.removeConnection(
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
  }

  public updateHeldNodePosition(moveSpeed: Vec2) {
    if (
      !this.settings.canMoveNodes ||
      this.mouseData.selectionBox.boundingBox
    ) {
      return;
    }

    this.mouseData.heldNodes.forEach(
      (element) => (element.position = element.position.add(moveSpeed)),
    );
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

    this.updateHeldNodePosition(localDelta);
    this.updateWithPrevious((prev) => ({
      position: prev.position.subtract(localDelta),
    }));
    this.eventStore.onCanvasTransformChanged.publish({
      position: this.position.serialize(),
    });
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
          if (event.button === MOUSE_BUTTONS.LEFT) {
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

    this.eventStore.onPointerUpInNode.subscribeMultiple([
      {
        name: "nodeflow:reset-mouse-data",
        event: () => {
          this.stopDragEdgeScroll();
          this.mouseData.pointerDown = false;

          if (this.mouseData.heldConnectors.length === 1) {
            this.mouseData.selections.clearNodes();
          }

          this.mouseData.selections.clearConnectors();
        },
      },
    ]);
  }

  public selectNode(nodeId: string, position?: Vec2) {
    this.mouseData.selectNode(nodeId, position ?? Vec2.zero(), false);
  }

  public transformVec2ToCanvas(position: Vec2) {
    return position
      .subtract(this.startPosition)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }
}
