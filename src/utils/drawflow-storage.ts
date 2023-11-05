import { createStore, produce } from "solid-js/store";
import {
  ConnectorSection,
  DrawflowData,
  MouseData,
  NodeConnector,
  NodeConnectorEvents,
  NodeData,
  Optional,
} from "../drawflow-types";
import { clamp } from "./math-utils";
import { windowSize } from "./screen-utils";
import { createMemo } from "solid-js";
import { intersectionOfSets, isSetEmpty } from "./misc-utils";
import { Size } from "./size";
import { Position } from "./position";

export const [nodes, setNodes] = createStore<Record<string, NodeData>>({});
export const [mouseData, setMouseData] = createStore<MouseData>({
  draggingNode: false,
  heldNodeId: undefined,
  heldOutputId: undefined,
  mousePosition: Position.default(),
  startPosition: undefined,
});
export const [drawflow, setDrawflow] = createStore<DrawflowData>({
  currentMoveSpeed: Position.default(),
  position: Position.default(),
  zoomLevel: 1,
  pinchDistance: 0,
});

export const Constants = {
  KEYBOARD_ZOOM_AMOUNT: 15,
  MAX_SPEED: 15,
  MAX_ZOOM: 200,
  MIN_ZOOM: 0.02,
  MOVE_DISTANCE: 100,
  MOVE_SLOWDOWN: 0.85,
  MOVE_SPEED_INCREASE: 1.5,
  SQRT_2_OVER_2: 0.7071067811865476,
  ZOOM_MULTIPLIER: 0.005,
} as const;

export const globalMousePosition = createMemo<Position>(() => {
  const { x, y } = mouseData.mousePosition; // screen coords
  const { x: offsetX, y: offsetY } = drawflow.position; // chart coords (offset amount)
  const zoom = drawflow.zoomLevel; // zoom multiplier

  // TODO: change to drawflow div size instead of screen size
  const screenCenter = Position.fromSize(windowSize()).divideBy(2);

  return new Position(
    (x - screenCenter.x) / zoom - offsetX + screenCenter.x,
    (y - screenCenter.y) / zoom - offsetY + screenCenter.y,
  );
});

export const updateZoom = (distance: number, zoomLocation: Position): void => {
  const oldZoom = drawflow.zoomLevel;
  const newZoom = clamp(
    oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER,
    Constants.MIN_ZOOM,
    Constants.MAX_ZOOM,
  );
  if (newZoom < Constants.MIN_ZOOM || newZoom > Constants.MAX_ZOOM) return;
  setMouseData("draggingNode", false);
  const windowDimensions = Position.fromSize(windowSize());
  const centeredZoomLocation = zoomLocation.subtract(
    windowDimensions.divideBy(2),
  );
  const oldScreenSize = windowDimensions.multiplyBy(oldZoom);
  const newScreenSize = windowDimensions.multiplyBy(newZoom);
  const oldOffset = centeredZoomLocation
    .subtract(oldScreenSize.divideBy(2))
    .divideBy(oldZoom);

  const newOffset = centeredZoomLocation
    .subtract(newScreenSize.divideBy(2))
    .divideBy(newZoom);

  setDrawflow((prev) => ({
    position: new Position(
      prev.position.x - oldOffset.x + newOffset.x,
      prev.position.y - oldOffset.y + newOffset.y,
    ),
    zoomLevel: newZoom,
  }));
};

export const updateBackgroundPosition = (
  moveDistance: Position,
  keyboard = false,
) => {
  if (mouseData.heldNodeId || keyboard === mouseData.draggingNode) return;
  setDrawflow(
    "position",
    (prev) =>
      new Position(
        prev.x + moveDistance.x / drawflow.zoomLevel,
        prev.y + moveDistance.y / drawflow.zoomLevel,
      ),
  );
};

export const heldKeys = new Set<string>();

export const KEYS: Record<string, Set<string>> = {
  MOVE_DOWN: new Set(["ArrowDown", "KeyS"]),
  MOVE_LEFT: new Set(["ArrowLeft", "KeyA"]),
  MOVE_RIGHT: new Set(["ArrowRight", "KeyD"]),
  MOVE_UP: new Set(["ArrowUp", "KeyW"]),
};

const calculateMovement = (
  isMoving: boolean,
  initialSpeed: number,
  positiveMovement: boolean,
  negativeMovement: boolean,
  inverse = false,
) => {
  let speed = initialSpeed;
  if (isMoving) {
    const change = Constants.MOVE_SPEED_INCREASE * (inverse ? -1 : 1);
    speed = clamp(
      speed + (positiveMovement ? change : 0) - (negativeMovement ? change : 0),
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED,
    );
  } else {
    speed = clamp(
      speed * Constants.MOVE_SLOWDOWN,
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED,
    );
  }
  if (speed <= 0.1 && speed >= -0.1) speed = 0;
  return speed;
};

export const resetMovement = () => {
  setDrawflow("currentMoveSpeed", Position.default());
  KEYS.MOVE_LEFT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_RIGHT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_UP.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_DOWN.forEach((key) => heldKeys.delete(key));
};

export const deselectNode = () => {
  setMouseData("heldNodeId", undefined);
  resetMovement();
};

export const updateNodePosition = (moveSpeed: Position) => {
  if (!mouseData.heldNodeId) return;
  const node = nodes[mouseData.heldNodeId];
  if (!node) return;
  const { x, y } = node.position;
  setNodes(
    mouseData.heldNodeId,
    "position",
    new Position(x + moveSpeed.x, y + moveSpeed.y),
  );
};

setInterval(() => {
  const movingLeft = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_LEFT));
  const movingRight = !isSetEmpty(
    intersectionOfSets(heldKeys, KEYS.MOVE_RIGHT),
  );
  const movingUp = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_UP));
  const movingDown = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_DOWN));

  const isDraggingNode = mouseData.heldNodeId !== undefined;

  const moveSpeed = new Position(
    calculateMovement(
      movingLeft || movingRight,
      drawflow.currentMoveSpeed.x,
      movingRight,
      movingLeft,
      !isDraggingNode,
    ),
    calculateMovement(
      movingUp || movingDown,
      drawflow.currentMoveSpeed.y,
      movingDown,
      movingUp,
      !isDraggingNode,
    ),
  );

  setDrawflow("currentMoveSpeed", moveSpeed);
  if (!mouseData.heldNodeId) {
    updateBackgroundPosition(drawflow.currentMoveSpeed, true);
  } else {
    updateNodePosition(drawflow.currentMoveSpeed);
  }
}, 10);

export const addNode = (x = 0, y = 0, data: Partial<NodeData>): NodeData => {
  let newNode: Optional<NodeData>;
  setNodes((prev) => {
    const newId = (Object.keys(prev).length + 1).toString();

    newNode = {
      connectorSections: {},
      css: data.css ?? {},
      customData: data.customData,
      display: data.display ?? (() => undefined),
      nodeId: newId,
      offset: Position.default(),
      position: new Position(x, y),
      ref: undefined,
    };

    return {
      [newId]: newNode,
    };
  });
  return newNode!;
};

export const removeNode = (nodeId: string) => {
  setNodes(
    produce((newNodes) => {
      delete newNodes[nodeId];
      Object.values(newNodes).forEach((node) =>
        Object.values(node.connectorSections).forEach((section) => {
          Object.values(section.connectors).forEach((connector) => {
            newNodes[node.nodeId].connectorSections[section.id].connectors[
              connector.connectorId
            ].destinations = connector.destinations.filter(
              (destination) => destination.destinationNodeId !== nodeId,
            );
          });
        }),
      );
    }),
  );
  deselectNode();
};

export const addConnection = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destinationNodeId: string,
  destinationConnectorId: string,
  css = "",
) => {
  const sourceNode = nodes[sourceNodeId];
  const destinationNode = nodes[destinationNodeId];

  // Check if nodes exist
  if (!sourceNode || !destinationNode) {
    return;
  }

  const sourceSection = getSectionFromConnector(
    sourceNodeId,
    sourceConnectorId,
  );
  const destinationSection = getSectionFromConnector(
    destinationNodeId,
    destinationConnectorId,
  );

  // Check if sections exist
  if (!sourceSection || !destinationSection) {
    return;
  }

  const sourceConnector = sourceSection.connectors[sourceConnectorId];
  const destinationConnector =
    destinationSection.connectors[destinationConnectorId];

  // Check if connectors exist
  if (!sourceConnector || !destinationConnector) {
    return;
  }

  if (
    sourceConnector.destinations.some(
      (destination) =>
        destination.destinationNodeId === destinationNodeId &&
        destination.destinationConnectorId === destinationConnectorId,
    )
  ) {
    return;
  }

  setNodes(
    sourceNodeId,
    "connectorSections",
    sourceSection.id,
    "connectors",
    sourceConnectorId,
    "destinations",
    sourceConnector.destinations.length,
    {
      destinationNodeId,
      destinationConnectorId,
      css,
    },
  );
};

export const addConnector = (
  nodeId: string,
  sectionId: string,
  connectorId: Optional<string>,
  data: Partial<NodeConnector>,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  connectorId ??= getConnectorCount(node.nodeId).toString();

  if (getConnector(nodeId, connectorId)) {
    return;
  }

  setNodes(nodeId, "connectorSections", sectionId, "connectors", connectorId, {
    connectorId,
    css: data?.css,
    destinations: data?.destinations ?? [],
    hovered: data?.hovered,
    position: data?.position ?? Position.default(),
    ref: undefined,
    size: Size.default(),
    type: data?.type,
    events: {
      ...DefaultNodeConnectorEvents,
      ...data?.events,
    },
  });
};

// TODO: change this so it's not split in 2 files, and doesn't cause circular imports
export const DefaultNodeConnectorEvents: NodeConnectorEvents = {};

export const getConnectorCount = (nodeId: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return 0;
  }

  return Object.values(node.connectorSections).reduce(
    (total, section) => total + Object.keys(section.connectors).length,
    0,
  );
};

export const getConnector = (
  nodeId: string,
  connectorId: string,
): Optional<NodeConnector> => {
  const node = nodes[nodeId];
  if (!node) {
    return undefined;
  }

  return getSectionFromConnector(nodeId, connectorId)?.connectors?.[
    connectorId
  ];
};

export const getSectionFromConnector = (
  nodeId: string,
  connectorId: string,
): Optional<ConnectorSection> => {
  const node = nodes[nodeId];
  if (!node) {
    return undefined;
  }

  return Object.values(node.connectorSections).find(
    (section) => section.connectors[connectorId],
  );
};

export const addConnectorSection = (
  nodeId: string,
  sectionId?: string,
  css?: string,
) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  sectionId ??= Object.keys(node.connectorSections).length.toString();

  if (node.connectorSections[sectionId]) {
    return;
  }

  setNodes(nodeId, "connectorSections", sectionId, {
    connectors: {},
    css,
    id: sectionId,
  });
};

/**
 * @param nodeId - the id of the node containing the connector
 * @param connectorId - the id of the connector
 * @returns the total number of connections coming into the specified connector
 */
export const getTotalConnectedInputs = (
  nodeId: string,
  connectorId?: string,
): number => {
  if (!nodes[nodeId]) {
    return 0;
  }

  return Object.values(nodes).reduce(
    (total, node) =>
      total +
      Object.values(node.connectorSections).reduce(
        (totalConnections, section) =>
          totalConnections +
          Object.values(section.connectors).reduce(
            (totalInputs, connector) =>
              totalInputs +
              connector.destinations.filter(
                (destination) =>
                  destination.destinationNodeId === nodeId &&
                  (!connectorId ||
                    destination.destinationConnectorId === connectorId),
              ).length,
            0,
          ),
        0,
      ),
    0,
  );
};

export const getAllConnectors = (nodeId: string): NodeConnector[] => {
  const node = nodes[nodeId];
  if (!node) {
    return [];
  }

  return Object.values(node.connectorSections).reduce(
    (connectors, section) =>
      connectors.concat(Object.values(section.connectors)),
    [] as NodeConnector[],
  );
};
