import {
  Changes,
  generateId,
  Vec2,
  type CompositeNodeOptions,
  type NodeflowData,
  type NodeflowNodeData,
  type NodeTemplate,
  type SerializedCompositeDefinition,
} from "@nodeflow-lib/vue";
import { DISPLAYS } from "./nodes/displays";
import { gateInputCount, WIRE_CSS, type GateKind } from "./simulation";
import { getMainCanvas, markCircuitDirty } from "./state";

export type PaletteType =
  | "switch"
  | "button"
  | "clock"
  | "gate"
  | "lamp"
  | "hex";

interface NodeConfig {
  inputs: number;
  outputs: number;
  customData: CustomNodeflowDataType;
}

const NODE_CONFIG: Record<PaletteType, NodeConfig> = {
  switch: { inputs: 0, outputs: 1, customData: { type: "switch", on: false } },
  button: { inputs: 0, outputs: 1, customData: { type: "button" } },
  clock: { inputs: 0, outputs: 1, customData: { type: "clock", period: 4 } },
  gate: { inputs: 2, outputs: 1, customData: { type: "gate", gate: "AND" } },
  lamp: { inputs: 1, outputs: 0, customData: { type: "lamp" } },
  hex: { inputs: 4, outputs: 0, customData: { type: "hex" } },
};

// Global class names (see styles/node.css): they are stable across builds,
// so saved chip types never point at classes that no longer exist.
export const nodeCss = (type: CustomNodeflowDataType["type"]) => ({
  normal: `node node--${type}`,
  selected: "node--selected",
});
export const INPUTS_SECTION_CSS = "inputs-section";
export const OUTPUTS_SECTION_CSS = "outputs-section";
export const INPUT_CONNECTOR_CSS = "connector connector--input";
export const OUTPUT_CONNECTOR_CSS = "connector connector--output";

export const GROUP_CSS = {
  frame: "group-frame",
  header: "group-header",
  collapsed: "group-collapsed",
  selected: "group--selected",
};

/** Port sections of chips, shared by creating and editing them. */
export const CHIP_SECTION_OPTIONS: Pick<
  CompositeNodeOptions,
  "inputSection" | "outputSection" | "connectorCss"
> = {
  inputSection: { css: INPUTS_SECTION_CSS },
  outputSection: { css: OUTPUTS_SECTION_CSS },
  connectorCss: { input: INPUT_CONNECTOR_CSS, output: OUTPUT_CONNECTOR_CSS },
};

export const createCircuitNode = (
  type: PaletteType,
  position: Vec2,
  centered = false,
  nodeflow: NodeflowData = getMainCanvas(),
  customData?: Partial<CustomNodeflowDataType>,
): NodeflowNodeData => {
  const config = NODE_CONFIG[type];
  const data = { ...config.customData, ...customData };
  const inputs = data.gate ? gateInputCount(data.gate) : config.inputs;
  const historyGroup = Changes.createHistoryGroup();

  const node = nodeflow.addNode(
    {
      css: nodeCss(data.type),
      position,
      display: DISPLAYS[data.type],
      centered,
      customData: data,
    },
    historyGroup,
  );

  const inputSection = node.addConnectorSection(
    { id: "inputs", css: INPUTS_SECTION_CSS },
    historyGroup,
  );
  const outputSection = node.addConnectorSection(
    { id: "outputs", css: OUTPUTS_SECTION_CSS },
    historyGroup,
  );
  for (let i = 0; i < config.outputs; i++) {
    outputSection.addConnector(
      { id: `output-${i}`, css: OUTPUT_CONNECTOR_CSS },
      historyGroup,
    );
  }
  for (let i = 0; i < inputs; i++) {
    inputSection.addConnector(
      { id: `input-${i}`, css: INPUT_CONNECTOR_CSS },
      historyGroup,
    );
  }

  markCircuitDirty();
  return node;
};

/**
 * Changes a gate's kind. Going between one-input (NOT, BUFFER) and
 * two-input kinds adds or removes the second input, and its wire, as one
 * undo step.
 */
export const setGateKind = (node: NodeflowNodeData, gate: GateKind) => {
  const section = node.connectorSections.get("inputs");
  if (section) {
    const historyGroup = Changes.createHistoryGroup();
    const wanted = gateInputCount(gate);
    for (let i = section.connectors.size; i < wanted; i++) {
      section.addConnector(
        { id: `input-${i}`, css: INPUT_CONNECTOR_CSS },
        historyGroup,
      );
    }
    for (let i = section.connectors.size - 1; i >= wanted; i--) {
      const id = `input-${i}`;
      node
        .getAllSourceConnections()
        .filter((wire) => wire.destinationConnectorId === id)
        .forEach((wire) =>
          node.nodeflow.removeConnection(
            wire.sourceNodeId,
            wire.sourceConnectorId,
            wire.destinationNodeId,
            wire.destinationConnectorId,
            historyGroup,
          ),
        );
      section.removeConnector(id, historyGroup);
    }
  }
  node.customData = { ...node.customData, gate };
  markCircuitDirty();
};

/** Replaces `nodeIds` with one chip. */
export const createChip = (
  nodeIds: Array<string>,
  nodeflow: NodeflowData = getMainCanvas(),
): NodeflowNodeData | undefined => {
  const count = Array.from(nodeflow.nodes.values()).filter(
    (node) => node.customData.type === "chip",
  ).length;

  const node = nodeflow.createCompositeNode(nodeIds, {
    css: nodeCss("chip"),
    display: DISPLAYS.chip,
    customData: { type: "chip", name: `Chip ${count + 1}` },
    ...CHIP_SECTION_OPTIONS,
    isInput: (connector) => connector.parentSection.id === "inputs",
  });

  markCircuitDirty();
  return node;
};

export const breakApartChip = (
  nodeId: string,
  nodeflow: NodeflowData = getMainCanvas(),
) => {
  nodeflow.explodeCompositeNode(nodeId);
  markCircuitDirty();
};

// ─── Saved chip types ───────────────────────────────────────────────────────

/** `definition` with every wire back to its unlit style, chips included. */
const normalizeDefinition = (
  definition: SerializedCompositeDefinition,
): SerializedCompositeDefinition => ({
  ...definition,
  nodes: Object.fromEntries(
    Object.entries(definition.nodes).map(([id, node]) => [
      id,
      node.composite
        ? { ...node, composite: normalizeDefinition(node.composite) }
        : node,
    ]),
  ),
  connections: definition.connections.map((connection) => ({
    ...connection,
    css: { ...WIRE_CSS },
  })),
});

/**
 * `template` without lit wires. The simulation styles wires by their signal,
 * which would otherwise be stored with the type and in export strings.
 */
export const normalizeTemplate = (template: NodeTemplate): NodeTemplate => ({
  ...template,
  definition: normalizeDefinition(template.definition),
});

/**
 * Saves a chip as a reusable type, or updates the one it came from. Saved
 * types live on the main canvas, also when the chip is in the editor.
 */
export const saveChipType = (
  nodeId: string,
  nodeflow: NodeflowData = getMainCanvas(),
) => {
  const node = nodeflow.nodes.get(nodeId);
  if (!node?.composite) return;

  const templateId = node.customData.templateId ?? generateId();
  node.customData = { ...node.customData, templateId };
  const saved = nodeflow.templates.saveFromNode(
    nodeId,
    node.customData.name ?? "Chip",
    templateId,
  );
  if (saved) getMainCanvas().templates.add(normalizeTemplate(saved));
  markCircuitDirty();
};

/**
 * Adds an instance of saved type `templateId` to `nodeflow`. Saved types live
 * on the main canvas, so another canvas gets a copy of the type first.
 */
export const spawnChipType = (
  templateId: string,
  position: Vec2,
  centered = false,
  nodeflow: NodeflowData = getMainCanvas(),
) => {
  const main = getMainCanvas();
  const template = main.templates.get(templateId);
  if (!template) return undefined;
  if (nodeflow !== main) nodeflow.templates.add(template);

  const node = nodeflow.instantiateTemplate(templateId, position, {
    centered,
  });
  markCircuitDirty();
  return node;
};

export const groupNodes = (
  nodeIds: Array<string>,
  nodeflow: NodeflowData = getMainCanvas(),
) =>
  nodeflow.addGroup(nodeIds, {
    title: `Group ${nodeflow.groups.size + 1}`,
    css: GROUP_CSS,
  });

const TEMPLATES_STORAGE_KEY = "nodeflow-circuit:chip-types";

/**
 * Demo persistence: core keeps saved types in memory only, so this example
 * stores them in localStorage. A real app could use a database instead.
 */
export const setupChipTypePersistence = (nodeflow: NodeflowData) => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (stored) {
      nodeflow.templates.load(
        (JSON.parse(stored) as Array<NodeTemplate>).map(normalizeTemplate),
      );
    }
  } catch {
    // Unavailable or corrupt storage: start without saved types.
  }

  nodeflow.eventStore.onTemplatesChanged.subscribe(
    "circuit:persist-chip-types",
    () => {
      try {
        localStorage.setItem(
          TEMPLATES_STORAGE_KEY,
          JSON.stringify(nodeflow.templates.toJSON()),
        );
      } catch {
        // Storage full or blocked; saved types last for this session only.
      }
    },
  );
};

// ─── Wiring ─────────────────────────────────────────────────────────────────

export const connectNodes = (
  nodeflow: NodeflowData,
  source: NodeflowNodeData,
  destination: NodeflowNodeData,
  destinationInput = "input-0",
  sourceOutput = "output-0",
) => {
  nodeflow.addConnection({
    sourceNodeId: source.id,
    sourceConnectorId: sourceOutput,
    destinationNodeId: destination.id,
    destinationConnectorId: destinationInput,
    css: { ...WIRE_CSS },
  });
};

/** Wires up a canvas: redraw on change, and the wiring rules. */
/** Every part rotates except chips and chip-editor terminals. */
export const isRotatable = (node: NodeflowNodeData) =>
  node.customData.type !== "chip" && node.customData.type !== "terminal";

/**
 * Turns the given parts a quarter turn clockwise about their centers, as one
 * undo step. Rotated parts swap width and height (see node.css), so each
 * moves by half the difference to stay centered.
 */
export const rotateNodes = (
  nodeIds: Array<string>,
  nodeflow: NodeflowData = getMainCanvas(),
) => {
  const historyGroup = Changes.createHistoryGroup();
  nodeIds.forEach((nodeId) => {
    const node = nodeflow.nodes.get(nodeId);
    if (!node || !isRotatable(node)) return;
    const { x: width, y: height } = node.size;
    nodeflow.updateNode(
      nodeId,
      {
        rotation: node.rotatedBy(1),
        position: node.position.add(
          Vec2.of((width - height) / 2, (height - width) / 2),
        ),
      },
      historyGroup,
    );
  });
  markCircuitDirty();
};

export const setupEvents = (nodeflow: NodeflowData) => {
  nodeflow.eventStore.onNodeDataChanged.subscribe(
    "circuit:node-data-changed",
    markCircuitDirty,
  );
  nodeflow.eventStore.onKeyDownInNodeflow.subscribe(
    "circuit:history-changed",
    markCircuitDirty,
  );
  nodeflow.eventStore.onKeyDownInNodeflow.subscribe(
    "circuit:rotate",
    ({ event }) => {
      if (event.code !== "KeyR" || event.ctrlKey || event.metaKey) return;
      if (event.altKey || event.repeat) return;
      rotateNodes(
        nodeflow.mouseData.heldNodes.map((node) => node.id),
        nodeflow,
      );
    },
  );

  // Replaces core's default handler: a wire runs from an output to a free
  // input. Outputs fan out freely; an input takes a single driver.
  nodeflow.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId, outputId, inputId }) => {
      if (outputNodeId === inputNodeId) return;

      const inputs =
        nodeflow.nodes.get(inputNodeId)?.connectorSections.get("inputs")
          ?.connectors;
      const outputs =
        nodeflow.nodes.get(outputNodeId)?.connectorSections.get("outputs")
          ?.connectors;

      if (!inputs?.has(inputId) || !outputs?.has(outputId)) return;
      if (inputs.get(inputId)!.sources.length > 0) return;

      nodeflow.addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: outputId,
        destinationNodeId: inputNodeId,
        destinationConnectorId: inputId,
        css: { ...WIRE_CSS },
      });
      markCircuitDirty();
    },
  );
};

/**
 * A half adder, an SR latch built from two NOR gates, and a blinking clock,
 * laid out on the 24px grid.
 */
export const setupDemoCircuit = (nodeflow: NodeflowData) => {
  const at = (x: number, y: number) => Vec2.of(x * 24, y * 24);
  const add = (
    type: PaletteType,
    x: number,
    y: number,
    data?: Partial<CustomNodeflowDataType>,
  ) => createCircuitNode(type, at(x, y), false, nodeflow, data);

  // Half adder: A + B = carry, sum.
  const a = add("switch", 2, 3, { name: "A", on: true });
  const b = add("switch", 2, 8, { name: "B" });
  const xor = add("gate", 11, 3, { gate: "XOR" });
  const and = add("gate", 11, 8, { gate: "AND" });
  const sum = add("lamp", 20, 3, { name: "Sum" });
  const carry = add("lamp", 20, 8, { name: "Carry" });
  connectNodes(nodeflow, a, xor, "input-0");
  connectNodes(nodeflow, b, xor, "input-1");
  connectNodes(nodeflow, a, and, "input-0");
  connectNodes(nodeflow, b, and, "input-1");
  connectNodes(nodeflow, xor, sum);
  connectNodes(nodeflow, and, carry);

  // SR latch: press Set and Q stays on until Reset is pressed. The lower
  // gate is added first, so it settles first and the latch starts reset.
  const reset = add("button", 2, 14, { name: "Reset" });
  const set = add("button", 2, 19, { name: "Set" });
  const notQ = add("gate", 11, 19, { gate: "NOR" });
  const q = add("gate", 11, 14, { gate: "NOR" });
  const qLamp = add("lamp", 20, 14, { name: "Q" });
  connectNodes(nodeflow, reset, q, "input-0");
  connectNodes(nodeflow, notQ, q, "input-1");
  connectNodes(nodeflow, q, notQ, "input-0");
  connectNodes(nodeflow, set, notQ, "input-1");
  connectNodes(nodeflow, q, qLamp);

  // A clock driving a lamp through a NOT gate.
  const clock = add("clock", 2, 25);
  const not = add("gate", 11, 25, { gate: "NOT" });
  const blink = add("lamp", 20, 25, { name: "Blink" });
  connectNodes(nodeflow, clock, not);
  connectNodes(nodeflow, not, blink);

  // The demo is the starting point, not something to undo.
  nodeflow.changes.deserialize({
    ...nodeflow.changes.serialize(),
    changes: [],
    currentChangeIndex: -1,
  });
  markCircuitDirty();
};
