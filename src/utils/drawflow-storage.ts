import { createStore, produce } from "solid-js/store";
import {
  MouseData,
  NodeCss,
  NodeData,
  Optional,
  Position,
} from "../types/types";
import { clamp } from "./math-utils";

export const [nodes, setNodes] = createStore<Record<string, NodeData>>({});
export const [mouseData, setMouseData] = createStore<MouseData>({
  dragging: false,
  mousePosition: { x: 0, y: 0 },
  startPosition: undefined,
  heldNodeId: undefined,
});
export const [drawflow, setDrawflow] = createStore<{
  position: Position;
  zoomLevel: number;
  currentMoveSpeed: Position;
}>({
  position: { x: 0, y: 0 },
  zoomLevel: 1,
  currentMoveSpeed: { x: 0, y: 0 },
});

export const Constants = {
  MAX_ZOOM: 200,
  MIN_ZOOM: 0.02,
  ZOOM_MULTIPLIER: 0.005,
  MOVE_DISTANCE: 100,
  MAX_SPEED: 20,
  MOVE_SPEED_INCREASE: 3,
  MOVE_SLOWDOWN: 10,
  SQRT_2_OVER_2: 0.7071067811865476,
} as const;

export const updateBackgroundPosition = (
  moveDistance: Position,
  keyboard = false
) => {
  if (mouseData.heldNodeId || (!mouseData.dragging && !keyboard)) return;
  setDrawflow("position", (prev) => ({
    x: prev.x + moveDistance.x / drawflow.zoomLevel,
    y: prev.y + moveDistance.y / drawflow.zoomLevel,
  }));
};

export const heldKeys = new Set<string>();

const horizontalKeys = ["ArrowLeft", "ArrowRight"] as const;
const verticalKeys = ["ArrowUp", "ArrowDown"] as const;

const calculateMovement = (
  hasMovement: boolean,
  initialSpeed: number,
  positiveMovement: boolean,
  negativeMovement: boolean
) => {
  let speed = initialSpeed;
  if (hasMovement) {
    speed = clamp(
      speed +
        (positiveMovement ? Constants.MOVE_SPEED_INCREASE : 0) -
        (negativeMovement ? Constants.MOVE_SPEED_INCREASE : 0),
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED
    );
  } else {
    speed = clamp(
      speed * (1 - 1 / Constants.MOVE_SLOWDOWN),
      -Constants.MAX_SPEED,
      Constants.MAX_SPEED
    );
  }
  if (speed <= 0.1 && speed >= -0.1) speed = 0;
  return speed;
};

setInterval(() => {
  setDrawflow("currentMoveSpeed", (prevPosition) => {
    // TODO: change with const strings instead of array access
    const movingLeft = heldKeys.has(horizontalKeys[0]);
    const movingRight = heldKeys.has(horizontalKeys[1]);
    const movingUp = heldKeys.has(verticalKeys[0]);
    const movingDown = heldKeys.has(verticalKeys[1]);

    return {
      x: calculateMovement(
        movingLeft || movingRight,
        prevPosition.x,
        movingLeft,
        movingRight
      ),
      y: calculateMovement(
        movingUp || movingDown,
        prevPosition.y,
        movingUp,
        movingDown
      ),
    };
  });
  updateBackgroundPosition(drawflow.currentMoveSpeed, true);
}, 1);

export const addNode = (x = 0, y = 0, css?: NodeCss): NodeData => {
  let newNode: Optional<NodeData>;
  setNodes((prev) => {
    const newId = (Object.keys(prev).length + 1).toString();

    newNode = {
      position: { x, y },
      nodeId: newId,
      ref: undefined,
      inputs: {},
      outputs: {},
      css: {
        normal: css?.normal,
        selected: css?.selected,
      },
    };

    return {
      [newId]: newNode,
    };
  });
  return newNode!;
};

// TODO: prevent this from resetting the curve's position
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

export const addInput = (nodeId: string, inputId?: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  inputId ??= Object.keys(node.inputs).length.toString();

  setNodes(nodeId, "inputs", inputId, {
    connectorId: inputId,
    ref: undefined,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });
};

export const addOutput = (nodeId: string, outputId?: string) => {
  const node = nodes[nodeId];
  if (!node) {
    return;
  }

  outputId ??= Object.keys(node.outputs).length.toString();

  setNodes(nodeId, "outputs", outputId, {
    connectorId: outputId,
    ref: undefined,
    position: { x: 0, y: 0 },
    destinations: [],
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
              (inputId ? destination.destinationInputId === inputId : true)
          ).length,
        0
      ),
    0
  );
};
