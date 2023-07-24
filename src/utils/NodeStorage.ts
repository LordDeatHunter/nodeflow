import { createSignal } from "solid-js";
import {
  NodeData,
  NodeInput,
  NodeOutput,
  Position,
  SignalObject,
} from "../types/types";

export const [nodes, setNodes] = createSignal<Record<string, NodeData>>({});

export const addNode = (x = 0, y = 0): NodeData | undefined => {
  let newNode;
  setNodes((prev) => {
    const newId = Object.keys(prev).length + 1;
    const [position, setPosition] = createSignal({ x, y });
    const [ref, setRef] = createSignal();

    const [inputs, setInputs] = createSignal<SignalObject<NodeInput>[]>([]);
    const [outputs, setOutputs] = createSignal<SignalObject<NodeOutput>[]>([]);

    newNode = {
      position: { get: position, set: setPosition },
      nodeId: newId.toString(),
      ref: { get: ref, set: setRef },
      inputs: { get: inputs, set: setInputs },
      outputs: { get: outputs, set: setOutputs },
    };

    return {
      ...prev,
      [newId]: newNode,
    };
  });
  return newNode;
};

export const removeNode = (nodeId: string) => {
  setNodes((prev) => {
    const { [nodeId]: _, ...rest } = prev;
    return rest;
  });
};

export const addConnection = (
  sourceNodeId: string,
  sourceOutputId: string,
  destinationNodeId: string,
  destinationInputId: string
) => {
  const sourceNode = nodes()[sourceNodeId];
  const destinationNode = nodes()[destinationNodeId];

  if (
    !sourceNode ||
    !destinationNode ||
    !(sourceOutputId in sourceNode.outputs.get()) ||
    !(destinationInputId in destinationNode.inputs.get())
  ) {
    return;
  }

  sourceNode.outputs.get()[sourceOutputId].set({
    ...sourceNode.outputs.get()[sourceOutputId].get(),
    destinationNodeId,
    destinationInputId,
  });
};

export const addInput = (nodeId: string, inputId?: string) => {
  const node = nodes()[nodeId];
  if (!node) {
    return;
  }

  inputId ??= node.inputs.get().length.toString();
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [input, setInput] = createSignal<NodeInput>({
    connectorId: inputId,
    ref: { get: ref, set: setRef },
    position: { get: position, set: setPosition },
  });

  node.inputs.get()[inputId] = { get: input, set: setInput };
};

export const addOutput = (nodeId: string, outputId?: string) => {
  const node = nodes()[nodeId];
  if (!node) {
    return;
  }

  outputId ??= node.outputs.get().length.toString();
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [output, setOutput] = createSignal<NodeOutput>({
    connectorId: outputId,
    ref: { get: ref, set: setRef },
    position: { get: position, set: setPosition },
  });
  node.outputs.get()[outputId] = { get: output, set: setOutput };
};

export const getInputPosition = (
  nodeId: string,
  connectorId: string
): Position | undefined => {
  const node = nodes()[nodeId];
  if (!node) {
    return;
  }

  return node.inputs
    .get()
    [connectorId]?.get()
    ?.ref.get()
    ?.getBoundingClientRect();
};

export const getOutputPosition = (
  nodeId: string,
  connectorId: string
): Position | undefined =>
  nodes()
    [nodeId]?.outputs?.get()
    ?.[connectorId]?.get()
    ?.ref.get()
    ?.getBoundingClientRect();
