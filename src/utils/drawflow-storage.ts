import { SerializedConnection } from "../drawflow-types";
import { clamp } from "./math-utils";
import { intersectionOfSets, isSetEmpty } from "./misc-utils";
import Vec2 from "./data/Vec2";
import Drawflow from "./data/Drawflow";
import DrawflowNode from "./data/DrawflowNode";
import ConnectorDestination from "./data/ConnectorDestination";
import ConnectorSource from "./data/ConnectorSource";

export const drawflow = new Drawflow();

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
  CURVE_MULTIPLIER: 3,
} as const;

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
  drawflow.currentMoveSpeed = Vec2.zero();
  KEYS.MOVE_LEFT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_RIGHT.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_UP.forEach((key) => heldKeys.delete(key));
  KEYS.MOVE_DOWN.forEach((key) => heldKeys.delete(key));
};

// TODO: Simplify this using events
setInterval(() => {
  const movingLeft = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_LEFT));
  const movingRight = !isSetEmpty(
    intersectionOfSets(heldKeys, KEYS.MOVE_RIGHT),
  );
  const movingUp = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_UP));
  const movingDown = !isSetEmpty(intersectionOfSets(heldKeys, KEYS.MOVE_DOWN));

  const isDraggingNode = drawflow.mouseData.heldNodeId !== undefined;

  drawflow.currentMoveSpeed = Vec2.of(
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
  if (!isDraggingNode) {
    drawflow.updateBackgroundPosition(drawflow.currentMoveSpeed, true);
  } else {
    DrawflowNode.updateHeldNodePosition(drawflow.currentMoveSpeed);
  }
}, 10);

export const addConnection = (
  data: SerializedConnection,
  addToHistory = true,
) => {
  const {
    sourceNodeId,
    sourceConnectorId,
    destinationNodeId,
    destinationConnectorId,
    css,
  } = data;

  // Check if nodes exist
  if (
    !drawflow.nodes.has(sourceNodeId) ||
    !drawflow.nodes.has(destinationNodeId)
  ) {
    return;
  }
  const sourceNode = drawflow.nodes.get(sourceNodeId)!;
  const destinationNode = drawflow.nodes.get(destinationNodeId)!;

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
    drawflow.changes.addChange({
      type: "add",
      source: "connection",
      applyChange: () => addConnection(data, false),
      undoChange: () =>
        removeConnection(
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
};

export const removeConnection = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destinationNodeId: string,
  destinationConnectorId: string,
  addToHistory = true,
) => {
  // Check if nodes exist
  if (
    !drawflow.nodes.has(sourceNodeId) ||
    !drawflow.nodes.has(destinationNodeId)
  ) {
    return;
  }
  const sourceNode = drawflow.nodes.get(sourceNodeId)!;
  const destinationNode = drawflow.nodes.get(destinationNodeId)!;

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
      addConnection(
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
      removeConnection(
        sourceNodeId,
        sourceConnectorId,
        destinationNodeId,
        destinationConnectorId,
        false,
      );
    };

    drawflow.changes.addChange({
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
};
