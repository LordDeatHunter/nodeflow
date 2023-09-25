import { createStore, produce } from "solid-js/store";
import {
  MouseData,
  NodeCss,
  NodeData,
  Optional,
  Position,
} from "../types/types";
import {
  clamp,
  convertSizeToPosition,
  dividePosition,
  multiplyPosition,
  subtractPositions,
} from "./math-utils";
import { getScreenSize } from "./screen-utils";
import { createMemo } from "solid-js";

export const [nodes, setNodes] = createStore<Record<string, NodeData>>({});
export const [mouseData, setMouseData] = createStore<MouseData>({
  draggingNode: false,
  heldNodeId: undefined,
  heldOutputId: undefined,
  mousePosition: { x: 0, y: 0 },
  startPosition: undefined,
});
export const [drawflow, setDrawflow] = createStore<{
  currentMoveSpeed: Position;
  position: Position;
  zoomLevel: number;
}>({
  currentMoveSpeed: { x: 0, y: 0 },
  position: { x: 0, y: 0 },
  zoomLevel: 1,
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

export const globalMousePosition = createMemo((): Position => {
  const { x, y } = mouseData.mousePosition; // screen coords
  const { x: offsetX, y: offsetY } = drawflow.position; // chart coords (offset amount)
  const zoom = drawflow.zoomLevel; // zoom multiplier

  // TODO: change to drawflow div size instead of screen size
  const screenCenter = dividePosition(
    convertSizeToPosition(getScreenSize()),
    2
  );

  return {
    x: (x - screenCenter.x) / zoom - offsetX + screenCenter.x,
    y: (y - screenCenter.y) / zoom - offsetY + screenCenter.y,
  };
});

export const updateZoom = (distance: number, zoomLocation: Position): void => {
  const oldZoom = drawflow.zoomLevel;
  const newZoom = clamp(
    oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER,
    Constants.MIN_ZOOM,
    Constants.MAX_ZOOM
  );
  if (newZoom < Constants.MIN_ZOOM || newZoom > Constants.MAX_ZOOM) return;
  setMouseData("draggingNode", false);
  const windowDimensions = convertSizeToPosition(getScreenSize());
  const centeredZoomLocation = subtractPositions(
    zoomLocation,
    dividePosition(windowDimensions, 2)
  );
  const oldScreenSize = multiplyPosition(windowDimensions, oldZoom);
  const newScreenSize = multiplyPosition(windowDimensions, newZoom);
  const oldOffset = dividePosition(
    subtractPositions(centeredZoomLocation, dividePosition(oldScreenSize, 2)),
    oldZoom
  );
  const newOffset = dividePosition(
    subtractPositions(centeredZoomLocation, dividePosition(newScreenSize, 2)),
    newZoom
  );
  setDrawflow((prev) => ({
    position: {
      x: prev.position.x - oldOffset.x + newOffset.x,
      y: prev.position.y - oldOffset.y + newOffset.y,
    },
    zoomLevel: newZoom,
  }));
};

export const updateBackgroundPosition = (
  moveDistance: Position,
  keyboard = false
) => {
  if (mouseData.heldNodeId || keyboard === mouseData.draggingNode) return;
  setDrawflow("position", (prev) => ({
    x: prev.x + moveDistance.x / drawflow.zoomLevel,
    y: prev.y + moveDistance.y / drawflow.zoomLevel,
  }));
};

export const heldKeys = new Set<string>();

const horizontalKeys = ["ArrowLeft", "ArrowRight"] as const;
const verticalKeys = ["ArrowUp", "ArrowDown"] as const;

const calculateMovement = (
  isMoving: boolean,
  initialSpeed: number,
  positiveMovement: boolean,
  negativeMovement: boolean,
  inverse = false
) => {
  let speed = initialSpeed;
  if (isMoving) {
    const change = Constants.MOVE_SPEED_INCREASE * (inverse ? -1 : 1);
    speed = clamp(
      speed + (positiveMovement ? change : 0) - (negativeMovement ? change : 0),
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED
    );
  } else {
    speed = clamp(
      speed * Constants.MOVE_SLOWDOWN,
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED
    );
  }
  if (speed <= 0.1 && speed >= -0.1) speed = 0;
  return speed;
};

export const resetMovement = () => {
  setDrawflow("currentMoveSpeed", { x: 0, y: 0 });
  heldKeys.delete(horizontalKeys[0]);
  heldKeys.delete(horizontalKeys[1]);
  heldKeys.delete(verticalKeys[0]);
  heldKeys.delete(verticalKeys[1]);
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
  setNodes(mouseData.heldNodeId, "position", {
    x: x + moveSpeed.x,
    y: y + moveSpeed.y,
  });
};

setInterval(() => {
  // TODO: change with const strings instead of array access
  const movingLeft = heldKeys.has(horizontalKeys[0]);
  const movingRight = heldKeys.has(horizontalKeys[1]);
  const movingUp = heldKeys.has(verticalKeys[0]);
  const movingDown = heldKeys.has(verticalKeys[1]);

  const isDraggingNode = mouseData.heldNodeId !== undefined;

  const moveSpeed = {
    x: calculateMovement(
      movingLeft || movingRight,
      drawflow.currentMoveSpeed.x,
      movingRight,
      movingLeft,
      !isDraggingNode
    ),
    y: calculateMovement(
      movingUp || movingDown,
      drawflow.currentMoveSpeed.y,
      movingDown,
      movingUp,
      !isDraggingNode
    ),
  };

  setDrawflow("currentMoveSpeed", moveSpeed);
  if (!mouseData.heldNodeId) {
    updateBackgroundPosition(drawflow.currentMoveSpeed, true);
  } else {
    updateNodePosition(drawflow.currentMoveSpeed);
  }
}, 10);

export const addNode = (x = 0, y = 0, css?: NodeCss): NodeData => {
  let newNode: Optional<NodeData>;
  setNodes((prev) => {
    const newId = (Object.keys(prev).length + 1).toString();

    newNode = {
      css: css ?? {},
      inputs: {},
      nodeId: newId,
      offset: { x: 0, y: 0 },
      outputs: {},
      position: { x, y },
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
        Object.values(node.outputs).forEach((output) => {
          newNodes[node.nodeId].outputs[output.connectorId].destinations =
            output.destinations.filter(
              (destination) => destination.destinationNodeId !== nodeId
            );
        })
      );
    })
  );
  deselectNode();
};

export const addConnection = (
  sourceNodeId: string,
  sourceOutputId: string,
  destinationNodeId: string,
  destinationInputId: string,
  css = "",
  createMissingNodes = false
) => {
  const sourceNode = nodes[sourceNodeId];
  const destinationNode = nodes[destinationNodeId];

  if (!sourceNode || !destinationNode) {
    return;
  }

  if (
    !(sourceOutputId in sourceNode.outputs) ||
    !(destinationInputId in destinationNode.inputs)
  ) {
    if (!createMissingNodes) {
      return;
    }

    if (!(sourceOutputId in sourceNode.outputs.get)) {
      addOutput(sourceNodeId, sourceOutputId);
    }

    if (!(destinationInputId in destinationNode.inputs)) {
      addInput(destinationNodeId, destinationInputId);
    }
  }

  setNodes(
    sourceNodeId,
    "outputs",
    sourceOutputId,
    "destinations",
    sourceNode.outputs[sourceOutputId].destinations.length,
    {
      destinationNodeId,
      destinationInputId,
      css,
    }
  );
};

export const addInput = (nodeId: string, inputId?: string, css?: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  inputId ??= Object.keys(node.inputs).length.toString();

  setNodes(nodeId, "inputs", inputId, {
    connectorId: inputId,
    css,
    position: { x: 0, y: 0 },
    ref: undefined,
    size: { width: 0, height: 0 },
  });
};

export const addOutput = (nodeId: string, outputId?: string, css?: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  outputId ??= Object.keys(node.outputs).length.toString();

  setNodes(nodeId, "outputs", outputId, {
    connectorId: outputId,
    css,
    destinations: [],
    position: { x: 0, y: 0 },
    ref: undefined,
    size: { width: 0, height: 0 },
  });
};

export const getTotalConnectedInputs = (
  nodeId: string,
  inputId?: string
): number => {
  if (!nodes[nodeId]) {
    return 0;
  }
  return Object.values(nodes).reduce(
    (total, node) =>
      total +
      Object.values(node.outputs).reduce(
        (totalOutputs, output) =>
          totalOutputs +
          output.destinations.filter(
            (destination) =>
              destination.destinationNodeId === nodeId &&
              (!inputId || destination.destinationInputId === inputId)
          ).length,
        0
      ),
    0
  );
};
