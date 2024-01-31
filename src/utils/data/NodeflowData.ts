import Vec2 from "./Vec2";
import { createStore, produce } from "solid-js/store";
import {
  DeepPartial,
  NodeflowDataType,
  NodeflowEventRecord,
  NodeflowNodeType,
  NodeflowSettings,
  SerializedConnection,
  SerializedNodeflowData,
  SerializedNodeflowNode,
} from "../../nodeflow-types";
import { windowSize } from "../screen-utils";
import { clamp } from "../math-utils";
import { heldKeys, KEYS } from "../nodeflow-storage";
import Changes from "./Changes";
import MouseData from "./MouseData";
import { ReactiveMap } from "@solid-primitives/map";
import NodeflowNodeData from "./NodeflowNodeData";
import NodeConnector from "./NodeConnector";
import ConnectorSource from "./ConnectorSource";
import ArrayWrapper from "./ArrayWrapper";
import ConnectorDestination from "./ConnectorDestination";
import { intersectionOfSets, isSetEmpty } from "../misc-utils";
import { NodeflowEventPublisher } from "./EventPublishers";
import CurveFunctions from "./CurveFunctions";

/**
 * NodeflowData is a class that manages the state of a Nodeflow canvas.
 * It uses the createStore function from solid-js/store to create a reactive store for the state.
 */
export default class NodeflowData {
  private readonly store;
  public readonly changes;
  public readonly mouseData;
  public readonly curveFunctions;
  public readonly settingsStore;
  /** A ReactiveMap that stores all the nodes on the Nodeflow canvas. */
  public readonly nodes;
  /** An instance of the NodeflowEventRecord class that handles various event subscriptions and publishing. */
  public readonly eventStore: NodeflowEventRecord;
  public static readonly DEFAULT_SETTINGS: NodeflowSettings = {
    debugMode: false,
    keyboardZoomMultiplier: 15,
    maxMovementSpeed: 15,
    maxZoom: 200,
    minZoom: 0.02,
    movementAcceleration: 1.5,
    movementSlowdown: 0.85,
    zoomMultiplier: 0.005,
  } as const;

  public constructor(
    settings: Partial<NodeflowSettings>,
    curveFunctions?: (nodeflow: NodeflowData) => CurveFunctions,
  ) {
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
    });

    this.changes = new Changes();
    this.mouseData = new MouseData(this);
    this.nodes = new ReactiveMap<string, NodeflowNodeData>();

    this.eventStore = {
      onKeyDownInNodeflow: new NodeflowEventPublisher<"onKeyDownInNodeflow">(
        this,
      ),
      onKeyUpInNodeflow: new NodeflowEventPublisher<"onKeyUpInNodeflow">(this),
      onMouseDownInConnector:
        new NodeflowEventPublisher<"onMouseDownInConnector">(this),
      onMouseDownInNodeflow:
        new NodeflowEventPublisher<"onMouseDownInNodeflow">(this),
      onMouseDownInNode: new NodeflowEventPublisher<"onMouseDownInNode">(this),
      onMouseMoveInNodeflow:
        new NodeflowEventPublisher<"onMouseMoveInNodeflow">(this),
      onNodeConnected: new NodeflowEventPublisher<"onNodeConnected">(this),
      onNodeDataChanged: new NodeflowEventPublisher<"onNodeDataChanged">(this),
      onPointerDownInNodeCurve:
        new NodeflowEventPublisher<"onPointerDownInNodeCurve">(this),
      onPointerUpInConnector:
        new NodeflowEventPublisher<"onPointerUpInConnector">(this),
      onPointerUpInNodeflow:
        new NodeflowEventPublisher<"onPointerUpInNodeflow">(this),
      onPointerUpInNode: new NodeflowEventPublisher<"onPointerUpInNode">(this),
      onTouchMoveInNodeflow:
        new NodeflowEventPublisher<"onTouchMoveInNodeflow">(this),
      onTouchStartInConnector:
        new NodeflowEventPublisher<"onTouchStartInConnector">(this),
      onTouchStartInNodeflow:
        new NodeflowEventPublisher<"onTouchStartInNodeflow">(this),
      onTouchStartInNode: new NodeflowEventPublisher<"onTouchStartInNode">(
        this,
      ),
      onWheelInNodeflow: new NodeflowEventPublisher<"onWheelInNodeflow">(this),
    };
    this.setupDefaultEventHandlers();

    // TODO: Simplify this using events
    setInterval(() => {
      const movingLeft = !isSetEmpty(
        intersectionOfSets(heldKeys, KEYS.MOVE_LEFT),
      );
      const movingRight = !isSetEmpty(
        intersectionOfSets(heldKeys, KEYS.MOVE_RIGHT),
      );
      const movingUp = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_UP));
      const movingDown = !isSetEmpty(
        intersectionOfSets(heldKeys, KEYS.MOVE_DOWN),
      );

      const isDraggingObject = this.mouseData.heldNodeId !== undefined;

      this.currentMoveSpeed = Vec2.of(
        this.calculateDirectionalMovementAmount(
          movingLeft || movingRight,
          this.currentMoveSpeed.x,
          movingRight,
          movingLeft,
          !isDraggingObject,
        ),
        this.calculateDirectionalMovementAmount(
          movingUp || movingDown,
          this.currentMoveSpeed.y,
          movingDown,
          movingUp,
          !isDraggingObject,
        ),
      );

      if (!isDraggingObject) {
        this.updateBackgroundPosition(this.currentMoveSpeed, true);
      } else {
        this.updateHeldNodePosition(
          this.currentMoveSpeed.divideBy(this.zoomLevel),
        );
      }
    }, 10);
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

  public deserialize(data: SerializedNodeflowData) {
    this.update({
      currentMoveSpeed: Vec2.deserializeOrDefault(data.currentMoveSpeed),
      pinchDistance: data.pinchDistance,
      position: Vec2.deserializeOrDefault(data.position),
      size: Vec2.deserializeOrDefault(data.size),
      startPosition: Vec2.deserializeOrDefault(data.startPosition),
      zoomLevel: data.zoomLevel,
    });

    this.nodes.clear();
    Object.entries(data.nodes).forEach(([_, node]) => {
      this.addNode(node, false);
    });

    this.mouseData.deserialize(data.mouseData);

    data.connections.forEach((connection) => {
      this.addConnection(connection, false);
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
    KEYS.MOVE_LEFT.forEach((key) => heldKeys.delete(key));
    KEYS.MOVE_RIGHT.forEach((key) => heldKeys.delete(key));
    KEYS.MOVE_UP.forEach((key) => heldKeys.delete(key));
    KEYS.MOVE_DOWN.forEach((key) => heldKeys.delete(key));
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
    const windowDimensions = windowSize();
    const windowCenter = windowDimensions.divideBy(2);

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
        speed * this.settings.movementSlowdown,
        -this.settings.maxMovementSpeed,
        this.settings.maxMovementSpeed,
      );
    }
    if (speed <= 0.1 && speed >= -0.1) speed = 0;
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

    this.mouseData.isDraggingObject = false;

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
      this.mouseData.heldNodeId ||
      keyboard === this.mouseData.isDraggingObject
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
   * @param addToHistory - whether to add this change to the history
   * @returns the created node
   */
  public addNode(
    data: Partial<SerializedNodeflowNode>,
    addToHistory = true,
  ): NodeflowNodeData {
    const node = NodeflowNodeData.deserialize(this, data);

    this.nodes.set(node.id, node);

    if (addToHistory) {
      const oldConnections = node.serializeConnections();

      this.changes.addChange({
        type: "add",
        source: "node",
        applyChange: () => {
          this.addNode(node.serialize(), false);

          oldConnections.forEach((connection) => {
            this.addConnection(connection, false);
          });
        },
        undoChange: () => {
          this.removeNode(node.id, false);
        },
      });
    }

    return node;
  }

  /**
   * Updates a node with the provided data.
   *
   * @param nodeId - the id of the node to update
   * @param data - the data to update the node with
   * @param addToHistory - whether to add this change to the history
   */
  public updateNode(
    nodeId: string,
    data: DeepPartial<NodeflowNodeType>,
    addToHistory = true,
  ) {
    if (!this.nodes.has(nodeId)) return;

    const node = this.nodes.get(nodeId)!;

    if (addToHistory) {
      const oldNode = this.nodes.get(nodeId)!;
      const oldConnections = oldNode.serializeConnections();

      const applyChange = () => {
        this.updateNode(nodeId, data, false);
      };

      const undoChange = () => {
        this.updateNode(nodeId, oldNode, false);
        oldConnections.forEach((connection) => {
          this.addConnection(connection, false);
        });
      };
      this.changes.addChange({
        type: "update",
        source: "node",
        applyChange,
        undoChange,
      });
    }

    this.eventStore.onNodeDataChanged.publish({ nodeId, data });

    node.updateWithPrevious(produce((prev) => Object.assign(prev, data)));
  }

  /**
   * Removes a node and all connections to and from it
   *
   * @param nodeId - the id of the node to remove
   * @param addToHistory - whether to add this change to the history
   */
  public removeNode(nodeId: string, addToHistory = true) {
    if (!this.nodes.has(nodeId)) return;

    this.mouseData.deselectNode();

    if (addToHistory) {
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
              destinationConnector.parentSection.parentNode.id !== nodeId,
          );
        });
        connector.sources = new ArrayWrapper<ConnectorSource>([]);
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
            ({ sourceConnector }) =>
              sourceConnector.parentSection.parentNode.id !== nodeId,
          );
        });
        connector.destinations = new ArrayWrapper<ConnectorDestination>([]);
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
  public addConnection(data: SerializedConnection, addToHistory = true) {
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

    if (addToHistory) {
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
   */
  public removeConnection(
    sourceNodeId: string,
    sourceConnectorId: string,
    destinationNodeId: string,
    destinationConnectorId: string,
    addToHistory = true,
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

    if (addToHistory) {
      const css = sourceConnector.destinations.find(
        (destination) =>
          destination.destinationConnector.parentSection.parentNode.id ===
          destinationNodeId,
      )?.css;

      const undoChange = () => {
        this.addConnection(
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
      });
    }

    sourceConnector.destinations.filterInPlace(
      (destination) =>
        destination.destinationConnector.parentSection.parentNode.id !==
        destinationNodeId,
    );

    destinationConnector.sources.filterInPlace(
      (source) =>
        source.sourceConnector.parentSection.parentNode.id !== sourceNodeId,
    );
  }

  /**
   * Updates the position of the held node based on the mouse movement.
   *
   * @param moveSpeed - the distance to move the node by
   */
  public updateHeldNodePosition(moveSpeed: Vec2) {
    const id = this.mouseData.heldNodeId;

    if (!id || !this.nodes.has(id)) return;

    const node = this.nodes.get(id)!;

    node.updateWithPrevious((prev) => ({
      position: prev.position.add(moveSpeed),
    }));
  }

  private setupDefaultEventHandlers() {
    this.eventStore.onNodeConnected.subscribeMultiple([
      {
        name: "create-connection",
        event: (data) =>
          this.addConnection({
            sourceNodeId: data.inputNodeId,
            sourceConnectorId: data.inputId,
            destinationNodeId: data.outputNodeId,
            destinationConnectorId: data.outputId,
          }),
      },
      {
        name: "reset-mouse-data",
        event: () => this.mouseData.reset(),
      },
    ]);

    this.eventStore.onMouseMoveInNodeflow.subscribeMultiple([
      {
        name: "update-background-position",
        event: ({ event }) => {
          this.updateBackgroundPosition(
            Vec2.of(event.movementX, event.movementY),
          );
        },
      },
    ]);

    this.eventStore.onPointerUpInNodeflow.subscribeMultiple([
      {
        name: "stop-propagation",
        event: ({ event }) => {
          event.stopPropagation();
          event.preventDefault();
        },
      },
      {
        name: "reset-mouse-data",
        event: () =>
          this.mouseData.updateWithPrevious((prev) => ({
            isDraggingObject: false,
            heldConnectorId: undefined,
            heldNodeId: prev.heldConnectorId ? undefined : prev.heldNodeId,
          })),
      },
    ]);

    this.eventStore.onTouchStartInNodeflow.subscribeMultiple([
      {
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "clear-held-keys",
        event: ({ event }) => {
          if (event.touches.length === 1) {
            heldKeys.clear();
          }
        },
      },
      {
        name: "handle-pinch",
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
        name: "update-mouse-data",
        event: ({ event }) => {
          const { touches } = event;

          if (touches.length !== 1) return;

          const touch = touches[0];
          const mousePosition = Vec2.fromEvent(touch);

          this.mouseData.update({
            isDraggingObject: true,
            heldNodeId: undefined,
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
        name: "handle-pinch",
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
          this.updateZoom(currDist - this.pinchDistance, centerPosition);
          this.pinchDistance = currDist;
        },
      },
      {
        name: "update-mouse-data",
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

    this.eventStore.onKeyUpInNodeflow.subscribe(
      "remove-held-key",
      ({ event }) => heldKeys.delete(event.key),
    );

    this.eventStore.onKeyDownInNodeflow.subscribeMultiple([
      {
        name: "add-held-key",
        event: ({ event }) => heldKeys.add(event.key),
      },
      {
        name: "handle-controls",
        event: ({ event }) => {
          // TODO: change to map
          switch (event.code) {
            case "Delete":
              if (this.mouseData.heldNodeId) {
                this.removeNode(this.mouseData.heldNodeId);
              } else if (this.mouseData.heldConnection) {
                this.removeConnection(
                  this.mouseData.heldConnection.sourceConnector.parentSection
                    .parentNode.id,
                  this.mouseData.heldConnection.sourceConnector.id,
                  this.mouseData.heldConnection.destinationConnector
                    .parentSection.parentNode.id,
                  this.mouseData.heldConnection.destinationConnector.id,
                );
              }
              break;
            case "Escape":
              this.mouseData.deselectNode();
              break;
            case "Space":
              if (this.mouseData.heldNodeId) {
                console.log(this.nodes.get(this.mouseData.heldNodeId));
              } else {
                console.log(this.nodes);
              }
              break;
            case "Equal":
            case "Minus":
              if (event.ctrlKey) {
                event.preventDefault();
                this.updateZoom(
                  this.settings.keyboardZoomMultiplier *
                    (event.code === "Equal" ? 1 : -1),
                  windowSize().divideBy(2),
                );
              }
              break;
            case "KeyZ":
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
          }
        },
      },
    ]);

    this.eventStore.onWheelInNodeflow.subscribeMultiple([
      {
        name: "update-zoom",
        event: ({ event }) => {
          this.updateZoom(-event.deltaY, Vec2.fromEvent(event));
        },
      },
      {
        name: "prevent-scroll",
        event: ({ event }) => {
          event.preventDefault();
        },
      },
    ]);

    this.eventStore.onMouseDownInNodeflow.subscribeMultiple([
      {
        name: "reset-movement",
        event: () => this.resetMovement(),
      },
      {
        name: "reset-mouse-data",
        event: ({ event }) =>
          this.mouseData.update({
            clickStartPosition: Vec2.of(
              event.clientX / this.zoomLevel - this.position.x,
              event.clientY / this.zoomLevel - this.position.y,
            ),
            isDraggingObject: true,
            heldConnection: undefined,
            heldConnectorId: undefined,
            heldNodeId: undefined,
            mousePosition: Vec2.fromEvent(event),
          }),
      },
      {
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onMouseDownInConnector.subscribeMultiple([
      {
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "start-creating-connection",
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
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
      {
        name: "start-creating-connection",
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
        name: "stop-propagation",
        event: ({ event }) => {
          event.preventDefault();
          event.stopPropagation();
        },
        priority: 2,
      },
      {
        name: "connect-held-nodes",
        event: ({ event, nodeId, connectorId }) => {
          if (!this.mouseData.heldConnectorId) return;
          this.eventStore.onNodeConnected.publish({
            outputNodeId: this.mouseData.heldNodeId!,
            outputId: this.mouseData.heldConnectorId!,
            inputNodeId: nodeId,
            inputId: connectorId,
            event,
          });
        },
        priority: 2,
      },
      {
        name: "reset-mouse-data",
        event: () =>
          this.mouseData.update({
            isDraggingObject: false,
            heldConnectorId: undefined,
            heldNodeId: undefined,
          }),
        priority: 1,
      },
    ]);

    this.eventStore.onMouseDownInNode.subscribeMultiple([
      {
        name: "select-node",
        event: ({ event, nodeId }) => {
          this.mouseData.selectNode(nodeId, Vec2.fromEvent(event));
        },
      },
      {
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onTouchStartInNode.subscribeMultiple([
      {
        name: "select-node",
        event: ({ event, nodeId }) => {
          const { clientX: x, clientY: y } = event.touches[0];
          this.mouseData.selectNode(nodeId, Vec2.of(x, y));
        },
      },
      {
        name: "stop-propagation",
        event: ({ event }) => event.stopPropagation(),
      },
    ]);

    this.eventStore.onPointerDownInNodeCurve.subscribeMultiple([
      {
        name: "stop-propagation",
        event: ({ event }) => {
          event.preventDefault();
          event.stopPropagation();
        },
        priority: 1,
      },
      {
        name: "update-mouse-data",
        event: ({ event, sourceConnector, destinationConnector }) =>
          this.mouseData.update({
            isDraggingObject: false,
            heldConnection: {
              sourceConnector,
              destinationConnector,
            },
            heldConnectorId: undefined,
            heldNodeId: undefined,
            mousePosition: Vec2.fromEvent(event),
          }),
      },
    ]);

    this.eventStore.onPointerUpInNode.subscribeMultiple([
      {
        name: "reset-mouse-data",
        event: () =>
          this.mouseData.update({
            isDraggingObject: false,
            heldConnection: undefined,
            heldConnectorId: undefined,
          }),
      },
    ]);
  }
}
