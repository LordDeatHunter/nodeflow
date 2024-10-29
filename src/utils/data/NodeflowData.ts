import Vec2 from "./Vec2";
import { createStore, produce } from "solid-js/store";
import {
  DeepPartial,
  NodeflowDataType,
  NodeflowEventRecord,
  NodeflowNodeType,
  NodeflowSettings,
  Optional,
  SelectableElementType,
  SerializedConnection,
  SerializedNodeflowData,
  SerializedNodeflowNode,
} from "../../nodeflow-types";
import { clamp } from "../math-utils";
import Changes from "./Changes";
import MouseData from "./MouseData";
import { ReactiveMap } from "@solid-primitives/map";
import NodeflowNodeData from "./NodeflowNodeData";
import NodeConnector from "./NodeConnector";
import ConnectorSource from "./ConnectorSource";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorDestination from "./ConnectorDestination";
import { deepCopy, intersectionOfSets, isSetEmpty } from "../misc-utils";
import { NodeflowEventPublisher } from "./EventPublishers";
import CurveFunctions from "./CurveFunctions";
import NodeflowLib from "../NodeflowLib";
import {
  KEYBOARD_KEY_CODES,
  KeyboardKeyCode,
  MOUSE_BUTTONS,
} from "../constants";
import KeyboardData from "./KeyboardData";
import { NodeflowChunking } from "./index";
import Rect from "./Rect";

/**
 * NodeflowData is a class that manages the state of a Nodeflow canvas.
 * It uses the createStore function from solid-js/store to create a reactive store for the state.
 */
export default class NodeflowData {
  private readonly store;
  public readonly changes;
  public readonly mouseData;
  public readonly keyboardData;
  public readonly curveFunctions;
  public readonly settingsStore;
  /** A ReactiveMap that stores all the nodes on the Nodeflow canvas. */
  public readonly nodes;
  /** An instance of the NodeflowEventRecord class that handles various event subscriptions and publishing. */
  public readonly eventStore: NodeflowEventRecord;
  public readonly chunking;
  public readonly id;
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
    this.settingsStore = createStore<NodeflowSettings>({
      ...NodeflowData.DEFAULT_SETTINGS,
      ...settings,
    });
    this.curveFunctions = curveFunctions?.(this) ?? new CurveFunctions(this);
    this.store = createStore<NodeflowDataType>({
      currentMoveSpeed: Vec2.zero(),
      position: Vec2.zero(),
      startPosition: Vec2.zero(),
      size: Vec2.zero(),
      zoomLevel: 1,
      pinchDistance: 0,
      intervalId: undefined,
    });

    this.changes = new Changes();
    this.mouseData = new MouseData(this);
    this.keyboardData = new KeyboardData(this);
    this.nodes = new ReactiveMap<string, NodeflowNodeData>();
    this.chunking = new NodeflowChunking(this);

    this.eventStore = {
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

    if (this.settings.canPan && !hasSelectedNodes) {
      this.updateBackgroundPosition(this.currentMoveSpeed, true);
    } else if (hasSelectedNodes && this.settings.canMoveNodes) {
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

  /**
   * Serializes all the connections in the NodeflowData instance into an array of SerializedConnection objects.
   */
  public serializeConnections(): Array<SerializedConnection> {
    return Array.from(this.nodes.values()).flatMap((node) =>
      node.serializeConnections(),
    );
  }

  public get settings() {
    return this.settingsStore[0];
  }

  public updateSettings(
    settings:
      | Partial<NodeflowSettings>
      | ((prev: NodeflowSettings) => Partial<NodeflowSettings>),
  ) {
    this.settingsStore[1](settings);
  }

  /**
   * Resets the currentMoveSpeed to zero and clears the held keys.
   */
  public resetMovement = () => {
    this.currentMoveSpeed = Vec2.zero();
    this.keymap.MOVE_LEFT.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_RIGHT.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_UP.forEach((key) => this.keyboardData.releaseKey(key));
    this.keymap.MOVE_DOWN.forEach((key) => this.keyboardData.releaseKey(key));
  };

  get currentMoveSpeed() {
    return this.store[0].currentMoveSpeed;
  }

  get position() {
    return this.store[0].position;
  }

  get startPosition() {
    return this.store[0].startPosition;
  }

  get size() {
    return this.store[0].size;
  }

  get zoomLevel() {
    return this.store[0].zoomLevel;
  }

  get pinchDistance() {
    return this.store[0].pinchDistance;
  }

  get intervalId() {
    return this.store[0].intervalId;
  }

  set currentMoveSpeed(value) {
    this.store[1]({ currentMoveSpeed: value });
  }

  set position(value) {
    this.store[1]({ position: value });
  }

  set startPosition(value) {
    this.store[1]({ startPosition: value });
  }

  set size(value) {
    this.store[1]({ size: value });
  }

  set zoomLevel(value) {
    this.store[1]({ zoomLevel: value });
  }

  set pinchDistance(value) {
    this.store[1]({ pinchDistance: value });
  }

  set intervalId(value: Optional<number>) {
    this.store[1]({ intervalId: value });
  }

  /**
   * Updates the NodeflowData instance with the provided data.
   *
   * @example
   * nodeflowData.update({
   *   position: Vec2.of(100, 100),
   *   zoomLevel: 2,
   * });
   */
  public update(data: Partial<NodeflowDataType>) {
    this.store[1](data);
  }

  /**
   * Updates the NodeflowData instance with the provided data using the current data as a base.
   *
   * @example
   * nodeflowData.updateWithPrevious((prev) => ({
   *   position: prev.position.add(Vec2.of(100, 100)),
   *   zoomLevel: prev.zoomLevel * 2,
   * }));
   */
  public updateWithPrevious(
    updater: (data: NodeflowDataType) => Partial<NodeflowDataType>,
  ) {
    this.store[1](updater);
  }

  /**
   * @returns the position of the center of the Nodeflow canvas.
   */
  public center() {
    const windowCenter = this.size.divideBy(2);

    return this.startPosition
      .add(windowCenter)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }

  /**
   * Calculates the movement speed based on the current speed, and the movement keys pressed.
   *
   * @param isMoving - whether there is currently movement being applied in the given direction
   * @param initialSpeed - the initial speed
   * @param positiveMovement - whether the player is moving in the positive direction (right or down)
   * @param negativeMovement - whether the player is moving in the negative direction (left or up)
   * @param inverse - whether to inverse the movement
   * @returns the new movement speed
   */
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

  /**
   * Updates the position of the background based on the mouse movement.
   * If the mouse is dragging a node, the background will not move.
   *
   * @param moveDistance - the distance to move the background by
   * @param keyboard - whether the movement is from the keyboard
   */
  public updateBackgroundPosition(moveDistance: Vec2, keyboard = false) {
    if (
      !this.mouseData.hasSelectedNodeflow() ||
      keyboard ===
        (this.mouseData.isHoldingButton(MOUSE_BUTTONS.MIDDLE) ||
          this.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT))
    ) {
      return;
    }

    this.updateWithPrevious((prev) => ({
      position: prev.position.add(moveDistance.divideBy(this.zoomLevel)),
    }));
  }

  /**
   * Creates a new node and adds it to the canvas.
   *
   * @param data - the data to create the node with
   * @param hasHistoryGroup - {string} - the history group to add the change to.{boolean} - whether to add the change to the history. Defaults to true.
   *
   * @returns the created node
   */
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
      const nodeflowId = this.id;

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          const nodeflow = NodeflowLib.get().getNodeflow(nodeflowId);
          nodeflow?.addNode(serializedNode, false);

          oldConnections.forEach((connection) => {
            nodeflow?.addConnection(connection, false);
          });
        },
        undoChange: () => {
          NodeflowLib.get().getNodeflow(nodeflowId)?.removeNode(node.id, false);
        },
        historyGroup: historyGroup as string,
      });
    }

    return node;
  }

  /**
   * Updates a node with the provided data.
   *
   * @param nodeId - the id of the node to update
   * @param data - the data to update the node with
   * @param hasHistoryGroup - {string} - the history group to add the change to. {boolean} - whether to add the change to the history. Defaults to true.
   */
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
      const nodeflowId = this.id;

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
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.updateNode(nodeId, data, false);
        },
        undoChange: () => {
          const nodeflow = NodeflowLib.get().getNodeflow(nodeflowId);
          nodeflow?.updateNode(nodeId, oldData, false);
          oldConnections.forEach((connection) => {
            nodeflow?.addConnection(connection, false);
          });
        },
        historyGroup: historyGroup as string,
      });
    }

    node.updateWithPrevious(produce((prev) => Object.assign(prev, data)));

    this.eventStore.onNodeDataChanged.publish({ nodeId, data });
  }

  /**
   * Removes a node and all connections to and from it
   *
   * @param nodeId - the id of the node to remove
   * @param hasHistoryGroup - {string} - the history group to add the change to. {boolean} - whether to add the change to the history. Defaults to true.
   */
  public removeNode(nodeId: string, hasHistoryGroup: string | boolean = true) {
    if (!this.nodes.has(nodeId)) return;

    this.mouseData.selections.deleteNodes((node) => node.id === nodeId);

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const oldNode = this.nodes.get(nodeId)!;
      const oldConnections = oldNode.serializeConnections();
      const nodeflowId = this.id;

      this.changes.addChange({
        type: "remove",
        source: "node",
        applyChange: () => {
          NodeflowLib.get().getNodeflow(nodeflowId)?.removeNode(nodeId, false);
        },
        undoChange: () => {
          const nodeflow = NodeflowLib.get().getNodeflow(nodeflowId);
          nodeflow?.addNode(oldNode.serialize(), false);

          oldConnections.forEach((connection) => {
            nodeflow?.addConnection(connection, false);
          });
        },
        historyGroup: historyGroup as string,
      });
    }

    this.removeIncomingConnections(nodeId);
    this.removeOutgoingConnections(nodeId);

    this.nodes.delete(nodeId);
  }

  /**
   * Removes all connections going into the node with the provided id.
   *
   * @param nodeId - the id of the node to remove incoming connections from
   */
  public removeIncomingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.sources.forEach(({ sourceConnector }) => {
          sourceConnector.destinations.filterInPlace(
            ({ destinationConnector }) =>
              destinationConnector.parentNode.id !== nodeId,
          );
        });
        connector.sources = new ArrayWrapper<ConnectorSource>();
      });
    });
  }

  /**
   * Removes all connections going out of the node with the provided id.
   *
   * @param nodeId - the id of the node to remove outgoing connections from
   */
  public removeOutgoingConnections(nodeId: string) {
    if (!this.nodes.has(nodeId)) {
      return;
    }

    this.nodes.get(nodeId)!.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        connector.destinations.forEach(({ destinationConnector }) => {
          destinationConnector.sources.filterInPlace(
            ({ sourceConnector }) => sourceConnector.parentNode.id !== nodeId,
          );
        });
        connector.destinations = new ArrayWrapper<ConnectorDestination>();
      });
    });
  }

  /**
   * @param nodeId - the id of the node to get the source connectors from
   *
   * @returns a list of all the connectors on the given node that have outgoing connections
   */
  public getAllSourceConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnectors();
  }

  /**
   * @param nodeId - the id of the node to get the destination connectors from
   *
   * @returns a list of all the connectors that the current node is connected to
   */
  public getAllDestinationConnectors(nodeId: string): NodeConnector[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnectors();
  }

  /**
   * @param nodeId - the id of the node
   *
   * @returns a list of all the connections that are going into the node
   */
  public getAllSourceConnections(nodeId: string): SerializedConnection[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllSourceConnections();
  }

  /**
   * @param nodeId - the id of the node to get the destination connections from.
   *
   * @returns a list of all the connections that are coming out of the node
   */
  public getAllDestinationConnections(nodeId: string): SerializedConnection[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    return this.nodes.get(nodeId)!.getAllDestinationConnections();
  }

  /**
   * Looks for a free numeric id for a node, starting from 0.
   *
   * @returns a stringified number that is not currently in use as a node id
   */
  public getNextFreeNodeId(): string {
    let newId = "0";

    for (let i = 1; this.nodes.has(newId); ++i) {
      newId = i.toString();
    }

    return newId;
  }

  /**
   * Creates a new connection between two connectors.
   */
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
    } = data;

    // Check if nodes exist
    if (!this.nodes.has(sourceNodeId) || !this.nodes.has(destinationNodeId)) {
      return;
    }
    const sourceNode = this.nodes.get(sourceNodeId)!;
    const destinationNode = this.nodes.get(destinationNodeId)!;

    const sourceConnector = sourceNode.getConnector(sourceConnectorId);
    const destinationConnector = destinationNode.getConnector(
      destinationConnectorId,
    );

    // Check if connectors exist
    if (!sourceConnector || !destinationConnector) {
      return;
    }

    // Check if connection already exists
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
      const nodeflowId = this.id;

      this.changes.addChange({
        type: "add",
        source: "connection",
        applyChange: () => this.addConnection(data, false),
        undoChange: () =>
          NodeflowLib.get()
            .getNodeflow(nodeflowId)
            ?.removeConnection(
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
      }),
    );

    destinationConnector.sources.push(
      new ConnectorSource({
        sourceConnector,
      }),
    );
  }

  /**
   * Removes a connection defined by the provided data.
   *
   * @param sourceNodeId - the id of the node that the connection is coming from
   * @param sourceConnectorId - the id of the connector that the connection is coming from
   * @param destinationNodeId - the id of the node that the connection is going to
   * @param destinationConnectorId - the id of the connector that the connection is going to
   * @param hasHistoryGroup - {string} - the history group to add the change to. {boolean} - whether to add the change to the history. Defaults to true.
   */
  public removeConnection(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
    hasHistoryGroup: string | boolean = true,
  ) {
    // Check if nodes exist
    if (!this.nodes.has(sourceNodeId) || !this.nodes.has(destinationNodeId)) {
      return;
    }
    const sourceNode = this.nodes.get(sourceNodeId)!;
    const destinationNode = this.nodes.get(destinationNodeId)!;

    const sourceConnector = sourceNode.getConnector(sourceConnectorId);
    const destinationConnector = destinationNode.getConnector(
      destinationConnectorId,
    );

    // Check if connectors exist
    if (!sourceConnector || !destinationConnector) {
      return;
    }

    const historyGroup = Changes.evaluateHistoryGroup(hasHistoryGroup);

    if (historyGroup) {
      const css = sourceConnector.destinations.find(
        (destination) =>
          destination.destinationConnector.parentNode.id === destinationNodeId,
      )?.css;
      const nodeflowId = this.id;

      const undoChange = () => {
        NodeflowLib.get().getNodeflow(nodeflowId)?.addConnection(
          {
            sourceNodeId,
            sourceConnectorId,
            destinationNodeId,
            destinationConnectorId,
            css,
          },
          false,
        );
      };

      const applyChange = () => {
        NodeflowLib.get()
          .getNodeflow(nodeflowId)
          ?.removeConnection(
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

  /**
   * Updates the position of the held node based on the mouse movement.
   *
   * @param moveSpeed - the distance to move the node by
   */
  public updateHeldNodePosition(moveSpeed: Vec2) {
    this.mouseData.heldNodes.forEach(
      (element) => (element.position = element.position.add(moveSpeed)),
    );
  }

  /**
   * Updates the position of the held node based on the mouse movement.
   *
   * @param position - the position to set the node to
   */
  public setHeldNodePosition(position: Vec2) {
    this.mouseData.heldNodes.forEach(
      (element) => (element.position = position),
    );
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

          this.setHeldNodePosition(
            Vec2.of(event.clientX, event.clientY)
              .divideBy(this.zoomLevel)
              .subtract(this.mouseData.clickStartPosition ?? Vec2.zero()),
          );
        },
      },
      {
        name: "nodeflow:update-background-position",
        event: ({ event }) => {
          if (this.mouseData.selectionBox.boundingBox) {
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
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "nodeflow:clear-held-keys",
        event: ({ event }) => {
          if (event.touches.length === 1) {
            this.keyboardData.clearKeys();
          }
        },
      },
      {
        name: "nodeflow:handle-pinch",
        event: ({ event }) => {
          const { touches } = event;

          if (touches.length !== 2) {
            return;
          }

          const { pageX: touch1X, pageY: touch1Y } = event.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = event.touches[1];
          this.pinchDistance = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
        },
      },
      {
        name: "nodeflow:update-mouse-data",
        event: ({ event }) => {
          const { touches } = event;

          if (touches.length !== 1) return;

          const touch = touches[0];
          const mousePosition = Vec2.fromEvent(touch);

          this.mouseData.selections.clearNodes();

          this.mouseData.update({
            pointerDown: true,
            mousePosition,
            clickStartPosition: Vec2.of(
              mousePosition.x / this.zoomLevel - this.position.x,
              mousePosition.y / this.zoomLevel - this.position.y,
            ),
          });
        },
      },
    ]);

    this.eventStore.onTouchMoveInNodeflow.subscribeMultiple([
      {
        name: "nodeflow:handle-pinch",
        event: ({ event }) => {
          const { touches } = event;
          if (touches.length !== 2) return;

          const { pageX: touch1X, pageY: touch1Y } = touches[0];
          const { pageX: touch2X, pageY: touch2Y } = touches[1];
          const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
          const centerPosition = Vec2.of(
            (touch1X + touch2X) / 2,
            (touch1Y + touch2Y) / 2,
          );
          if (this.settings.canZoom) {
            this.updateZoom(currDist - this.pinchDistance, centerPosition);
          }
          this.pinchDistance = currDist;
        },
      },
      {
        name: "nodeflow:update-mouse-data",
        event: ({ event }) => {
          const { touches } = event;

          if (touches.length !== 1) return;

          this.mouseData.updateWithPrevious((previous) => {
            const newMousePos = Vec2.fromEvent(touches[0]);
            this.updateBackgroundPosition(
              newMousePos.subtract(previous.mousePosition),
            );
            return { mousePosition: newMousePos };
          });
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
          // TODO: change to map or event system
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
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "nodeflow:start-creating-connection",
        event: ({ event, nodeId, connectorId }) => {
          const { clientX: x, clientY: y } = event.touches[0];
          this.mouseData.startCreatingConnection(
            nodeId,
            Vec2.of(x, y),
            connectorId,
          );
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
          if (!this.keyboardData.isActionPressed(this.keymap.SELECT_MULTIPLE)) {
            this.mouseData.clearSelections();
          }

          this.mouseData.selectNode(
            nodeId,
            Vec2.of(x, y),
            this.settings.canMoveNodes,
          );
        },
      },
      {
        name: "nodeflow:stop-propagation",
        event: ({ event }) => event.stopPropagation(),
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

  /**
   * Transforms a global position to a position relative to the canvas.
   *
   * 1. Subtracts the starting position of the canvas from the global position, this makes the position relative to the start of the canvas
   * 2. Divides by the zoom level, this zooms the working area to the relevant size
   * 3. Subtracts the canvas offset to get the final position
   *
   * @param position
   */
  public transformVec2ToCanvas(position: Vec2) {
    return position
      .subtract(this.startPosition)
      .divideBy(this.zoomLevel)
      .subtract(this.position);
  }
}
