import { Component } from "solid-js";
import { NodeflowNodeData, Vec2 } from "@nodeflow-lib/solid";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import NumberNode from "./NumberNode";
import OperationNode from "./OperationNode";
import DisplayNode from "./DisplayNode";
import { markBlueprintDirty } from "./reactivity";
import { nodeflowData } from "./App";

export type NodeType = "number" | "operation" | "display";

type NodeConfig = {
  display: Component<{ node: NodeflowNodeData }>;
  inputs: number;
  outputs: number;
  customData: CustomNodeflowDataType;
};

const NODE_CONFIG: Record<NodeType, NodeConfig> = {
  number: {
    display: NumberNode,
    inputs: 0,
    outputs: 1,
    customData: { type: "number", value: 0 },
  },
  operation: {
    display: OperationNode,
    inputs: 2,
    outputs: 1,
    customData: { type: "operation", operator: "+" },
  },
  display: {
    display: DisplayNode,
    inputs: 1,
    outputs: 0,
    customData: { type: "display" },
  },
};

const connectionCss = {
  normal: curveCss.connection,
  selected: curveCss.selectedConnection,
};

export const createBlueprintNode = (
  type: NodeType,
  position: Vec2,
  centered = false,
): NodeflowNodeData => {
  const config = NODE_CONFIG[type];
  const historyGroup = crypto.randomUUID();

  const newNode = nodeflowData.addNode(
    {
      css: { normal: nodeCss.node, selected: nodeCss.selectedNode },
      position,
      display: config.display,
      centered,
      customData: { ...config.customData },
    },
    historyGroup,
  );

  const inputSection = newNode.addConnectorSection(
    { id: "inputs", css: nodeCss.inputsSection },
    historyGroup,
  );
  const outputSection = newNode.addConnectorSection(
    { id: "outputs", css: nodeCss.outputsSection },
    historyGroup,
  );

  for (let i = 0; i < config.outputs; i++) {
    outputSection.addConnector(
      { id: `output-${i}`, css: nodeCss.outputConnector },
      historyGroup,
    );
  }

  for (let i = 0; i < config.inputs; i++) {
    inputSection.addConnector(
      { id: `input-${i}`, css: nodeCss.inputConnector },
      historyGroup,
    );
  }

  markBlueprintDirty();
  return newNode;
};

export const connectNodes = (
  source: NodeflowNodeData,
  destination: NodeflowNodeData,
  destinationInput: string,
) => {
  nodeflowData.addConnection({
    sourceNodeId: source.id,
    sourceConnectorId: "output-0",
    destinationNodeId: destination.id,
    destinationConnectorId: destinationInput,
    css: connectionCss,
  });
  markBlueprintDirty();
};

export const setupEvents = () => {
  nodeflowData.eventStore.onNodeDataChanged.subscribe(
    "blueprint:node-data-changed",
    markBlueprintDirty,
  );
  nodeflowData.eventStore.onKeyDownInNodeflow.subscribe(
    "blueprint:history-changed",
    markBlueprintDirty,
  );

  nodeflowData.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId, outputId, inputId }) => {
      if (outputNodeId === inputNodeId) return;

      const inputNode = nodeflowData.nodes.get(inputNodeId);
      const outputNode = nodeflowData.nodes.get(outputNodeId);

      const inputs = inputNode?.connectorSections.get("inputs")?.connectors;
      const outputs = outputNode?.connectorSections.get("outputs")?.connectors;

      if (!inputs?.has(inputId) || !outputs?.has(outputId)) return;
      if (inputs.get(inputId)!.sources.length > 0) return;

      nodeflowData.addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: outputId,
        destinationNodeId: inputNodeId,
        destinationConnectorId: inputId,
        css: connectionCss,
      });
      markBlueprintDirty();
    },
  );
};

export const setupDemoGraph = () => {
  const first = createBlueprintNode("number", Vec2.of(220, 120), true);
  const second = createBlueprintNode("number", Vec2.of(220, 460), true);
  first.customData = { type: "number", value: 4 };
  second.customData = { type: "number", value: 6 };

  const operation = createBlueprintNode("operation", Vec2.of(700, 290), true);
  const display = createBlueprintNode("display", Vec2.of(1180, 290), true);

  connectNodes(first, operation, "input-0");
  connectNodes(second, operation, "input-1");
  connectNodes(operation, display, "input-0");
};
