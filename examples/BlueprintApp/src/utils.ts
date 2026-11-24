import { Component } from "solid-js";
import {
  Changes,
  CompositeNodeOptions,
  generateId,
  NodeflowData,
  NodeTemplate,
  NodeflowNodeData,
  SerializedNodeflowNode,
  Vec2,
} from "@nodeflow-lib/solid";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import groupCss from "./styles/group.module.scss";
import NumberNode from "./NumberNode";
import OperationNode from "./OperationNode";
import NegationNode from "./NegationNode";
import PlusMinusNode from "./PlusMinusNode";
import DisplayNode from "./DisplayNode";
import DerivedNode from "./DerivedNode";
import TerminalNode from "./TerminalNode";
import { markBlueprintDirty } from "./reactivity";
import { nodeflowData } from "./App";

export type NodeType =
  | "number"
  | "operation"
  | "negation"
  | "plusMinus"
  | "display";

type NodeDisplay = Component<{ node: NodeflowNodeData }>;

const DISPLAYS: Record<CustomNodeflowDataType["type"], NodeDisplay> = {
  number: NumberNode,
  operation: OperationNode,
  negation: NegationNode,
  plusMinus: PlusMinusNode,
  display: DisplayNode,
  derived: DerivedNode,
  terminal: TerminalNode,
};

/**
 * Picks a node's component from its type. Saved types are stored as JSON,
 * which cannot hold components, so core asks for them when spawning.
 */
export const resolveNodeDisplay = (
  node: Partial<SerializedNodeflowNode>,
): NodeDisplay | undefined =>
  node.customData ? DISPLAYS[node.customData.type] : undefined;

type NodeConfig = {
  inputs: number;
  outputs: number;
  customData: CustomNodeflowDataType;
};

const NODE_CONFIG: Record<NodeType, NodeConfig> = {
  number: {
    inputs: 0,
    outputs: 1,
    customData: { type: "number", value: 0 },
  },
  operation: {
    inputs: 2,
    outputs: 1,
    customData: { type: "operation", operator: "+" },
  },
  negation: {
    inputs: 1,
    outputs: 1,
    customData: { type: "negation" },
  },
  plusMinus: {
    inputs: 1,
    outputs: 2,
    customData: { type: "plusMinus" },
  },
  display: {
    inputs: 1,
    outputs: 0,
    customData: { type: "display" },
  },
};

export const connectionCss = {
  normal: curveCss.connection,
  selected: curveCss.selectedConnection,
};

/** Port sections of derived nodes, shared by creating and editing them. */
export const DERIVED_SECTION_OPTIONS: Pick<
  CompositeNodeOptions,
  "inputSection" | "outputSection" | "connectorCss"
> = {
  inputSection: { css: nodeCss.inputsSection },
  outputSection: { css: nodeCss.outputsSection },
  connectorCss: {
    input: nodeCss.inputConnector,
    output: nodeCss.outputConnector,
  },
};

export const createBlueprintNode = (
  type: NodeType,
  position: Vec2,
  centered = false,
  nodeflow: NodeflowData = nodeflowData,
): NodeflowNodeData => {
  const config = NODE_CONFIG[type];
  const historyGroup = Changes.createHistoryGroup();

  const newNode = nodeflow.addNode(
    {
      css: { normal: nodeCss.node, selected: nodeCss.selectedNode },
      position,
      display: DISPLAYS[type],
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

/** Replaces `nodeIds` with one derived node. */
export const createDerivedNode = (
  nodeIds: Array<string>,
  nodeflow: NodeflowData = nodeflowData,
): NodeflowNodeData | undefined => {
  const count = Array.from(nodeflow.nodes.values()).filter(
    (node) => node.customData.type === "derived",
  ).length;

  const node = nodeflow.createCompositeNode(nodeIds, {
    css: {
      normal: `${nodeCss.node} ${nodeCss.derivedNode}`,
      selected: nodeCss.selectedNode,
    },
    display: DerivedNode,
    customData: { type: "derived", name: `Derived node ${count + 1}` },
    ...DERIVED_SECTION_OPTIONS,
    isInput: (connector) => connector.parentSection.id === "inputs",
  });

  markBlueprintDirty();
  return node;
};

export const breakApartDerivedNode = (
  nodeId: string,
  nodeflow: NodeflowData = nodeflowData,
) => {
  nodeflow.explodeCompositeNode(nodeId);
  markBlueprintDirty();
};

/**
 * Saves a derived node as a reusable type, or updates the one it came from.
 * Saved types live on the main canvas, also when the node is in the editor.
 */
export const saveDerivedNodeType = (
  nodeId: string,
  nodeflow: NodeflowData = nodeflowData,
) => {
  const node = nodeflow.nodes.get(nodeId);
  if (!node?.composite) return;

  const templateId = node.customData.templateId ?? generateId();
  node.customData = { ...node.customData, templateId };
  const saved = nodeflow.templates.saveFromNode(
    nodeId,
    node.customData.name ?? "Derived node",
    templateId,
  );
  if (saved && nodeflow !== nodeflowData) nodeflowData.templates.add(saved);
  markBlueprintDirty();
};

/**
 * Adds an instance of saved type `templateId` to `nodeflow`. Saved types live
 * on the main canvas, so another canvas gets a copy of the type first.
 */
export const spawnSavedType = (
  templateId: string,
  position: Vec2,
  centered = false,
  nodeflow: NodeflowData = nodeflowData,
) => {
  const template = nodeflowData.templates.get(templateId);
  if (!template) return undefined;
  if (nodeflow !== nodeflowData) nodeflow.templates.add(template);

  const node = nodeflow.instantiateTemplate(templateId, position, {
    centered,
  });
  markBlueprintDirty();
  return node;
};

export const groupNodes = (
  nodeIds: Array<string>,
  nodeflow: NodeflowData = nodeflowData,
) =>
  nodeflow.addGroup(nodeIds, {
    title: `Group ${nodeflow.groups.size + 1}`,
    css: {
      frame: groupCss.frame,
      header: groupCss.header,
      collapsed: groupCss.collapsed,
      selected: groupCss.selected,
    },
  });

const TEMPLATES_STORAGE_KEY = "nodeflow-blueprint:saved-types";

/**
 * Demo persistence: core keeps saved types in memory only, so this example
 * stores them in localStorage. A real app could use a database instead.
 */
export const setupSavedTypePersistence = () => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (stored) {
      nodeflowData.templates.load(JSON.parse(stored) as Array<NodeTemplate>);
    }
  } catch {
    // Unavailable or corrupt storage: start without saved types.
  }

  nodeflowData.eventStore.onTemplatesChanged.subscribe(
    "blueprint:persist-saved-types",
    () => {
      try {
        localStorage.setItem(
          TEMPLATES_STORAGE_KEY,
          JSON.stringify(nodeflowData.templates.toJSON()),
        );
      } catch {
        // Storage full or blocked; saved types last for this session only.
      }
    },
  );
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

/** Wires up a canvas: redraw on change, and the connection rules. */
export const setupEvents = (nodeflow: NodeflowData = nodeflowData) => {
  nodeflow.eventStore.onNodeDataChanged.subscribe(
    "blueprint:node-data-changed",
    markBlueprintDirty,
  );
  nodeflow.eventStore.onKeyDownInNodeflow.subscribe(
    "blueprint:history-changed",
    markBlueprintDirty,
  );

  nodeflow.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId, outputId, inputId }) => {
      if (outputNodeId === inputNodeId) return;

      const inputNode = nodeflow.nodes.get(inputNodeId);
      const outputNode = nodeflow.nodes.get(outputNodeId);

      const inputs = inputNode?.connectorSections.get("inputs")?.connectors;
      const outputs = outputNode?.connectorSections.get("outputs")?.connectors;

      if (!inputs?.has(inputId) || !outputs?.has(outputId)) return;
      if (inputs.get(inputId)!.sources.length > 0) return;

      nodeflow.addConnection({
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
  const first = createBlueprintNode("number", Vec2.of(230, 130), true);
  const second = createBlueprintNode("number", Vec2.of(230, 470), true);
  first.customData = { type: "number", value: 4 };
  second.customData = { type: "number", value: 6 };

  const operation = createBlueprintNode("operation", Vec2.of(640, 300), true);
  const display = createBlueprintNode("display", Vec2.of(1020, 300), true);

  connectNodes(first, operation, "input-0");
  connectNodes(second, operation, "input-1");
  connectNodes(operation, display, "input-0");
};
