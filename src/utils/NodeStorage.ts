import { createStore, produce } from "solid-js/store";
import { MouseData, NodeCss, NodeData } from "../types/types";

export const [nodes, setNodes] = createStore<Record<string, NodeData>>({});
export const [mouseData, setMouseData] = createStore<MouseData>({
  dragging: false,
  mousePosition: { x: 0, y: 0 },
  startPosition: undefined,
  heldNodeId: undefined,
});

export const addNode = (x = 0, y = 0, css?: NodeCss): NodeData => {
  let newNode: NodeData | undefined;
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
