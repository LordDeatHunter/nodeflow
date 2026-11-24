import { computed, ref, shallowRef } from "vue";
import {
  Changes,
  createCompositeSections,
  getCompositePortTargets,
  Vec2,
  type CompositePort,
  type NodeflowData,
  type NodeflowNodeData,
  type SerializedCompositeDefinition,
  type SerializedNodeflowNode,
} from "@nodeflow-lib/vue";
import {
  CHIP_SECTION_OPTIONS,
  INPUT_CONNECTOR_CSS,
  INPUTS_SECTION_CSS,
  nodeCss,
  normalizeTemplate,
  OUTPUT_CONNECTOR_CSS,
  OUTPUTS_SECTION_CSS,
} from "./circuit";
import { WIRE_CSS } from "./simulation";
import { GRID_SIZE } from "./settings";
import { getMainCanvas, markCircuitDirty } from "./state";

/*
 * The nested canvas a saved chip type is edited on. It shows the type's inner
 * nodes between two terminals standing for the chip's pins. The canvas is
 * mounted by ChipEditor.vue while a session is open, and filled once ready.
 */

export const INPUTS_TERMINAL_ID = "__terminal-inputs";
export const OUTPUTS_TERMINAL_ID = "__terminal-outputs";

const TERMINAL_WIDTH = 216;
const TERMINAL_GAP = GRID_SIZE * 5;
const MARGIN = GRID_SIZE * 2;

export interface EditorSession {
  templateId: string;
  name: string;
}

export const editorSession = ref<EditorSession | undefined>();
/** The editor's canvas while it is mounted. */
export const editorCanvas = shallowRef<NodeflowData | undefined>();

/** The canvas the palette adds to: the chip editor while it is open. */
export const activeCanvas = (): NodeflowData =>
  (editorSession.value && editorCanvas.value) || getMainCanvas();

export const isTerminal = (node: NodeflowNodeData) =>
  node.customData.type === "terminal";

/** Keeps the terminals out of a Delete: only inner nodes can be removed. */
export const protectTerminals = (canvas: NodeflowData) =>
  canvas.eventStore.onKeyDownInNodeflow.subscribe(
    "circuit:protect-terminals",
    ({ event }) => {
      if (event.code === "Delete") canvas.mouseData.deleteNodes(isTerminal);
    },
    // Runs before core's own Delete handling.
    10,
  );

const innerNodes = (canvas: NodeflowData) =>
  Array.from(canvas.nodes.values()).filter((node) => !isTerminal(node));

const terminal = (
  id: string,
  side: "inputs" | "outputs",
  ports: Array<CompositePort>,
  position: Vec2,
): Partial<SerializedNodeflowNode> => {
  const portNames = Object.fromEntries(
    ports.flatMap((port, i) => (port.name ? [[`port-${i}`, port.name]] : [])),
  );
  // The inputs terminal offers its pins as outputs, and vice versa.
  const sectionId = side === "inputs" ? "outputs" : "inputs";
  return {
    id,
    position: position.serialize(),
    centered: false,
    css: nodeCss("terminal"),
    customData: { type: "terminal", side, portNames },
    connectorSections: {
      [sectionId]: {
        id: sectionId,
        css: `${
          side === "inputs" ? OUTPUTS_SECTION_CSS : INPUTS_SECTION_CSS
        } terminal-section`,
        connectors: Object.fromEntries(
          ports.map((_, i) => [
            `port-${i}`,
            {
              id: `port-${i}`,
              css:
                side === "inputs" ? OUTPUT_CONNECTOR_CSS : INPUT_CONNECTOR_CSS,
              hovered: false,
              position: { x: 0, y: 0 },
            },
          ]),
        ),
      },
    },
  };
};

/** Opens saved chip type `templateId` in the editor. */
export const openChipEditor = (templateId: string) => {
  const template = getMainCanvas().templates.get(templateId);
  if (!template) return;
  editorSession.value = { templateId, name: template.name };
  markCircuitDirty();
};

/**
 * Fills a freshly mounted editor canvas with the session's chip type. The
 * terminals start with the type's current pins, wired as they are, so saving
 * right away changes nothing.
 */
export const populateEditor = (canvas: NodeflowData) => {
  const session = editorSession.value;
  const template = session && getMainCanvas().templates.get(session.templateId);
  if (!template) return;

  const { definition } = template;
  const nodes = Object.values(definition.nodes);
  const innerOrigin = Vec2.of(MARGIN + TERMINAL_WIDTH + TERMINAL_GAP, MARGIN);

  nodes.forEach((node) =>
    canvas.addNode(
      {
        ...node,
        position: innerOrigin
          .add(Vec2.of(node.position.x, node.position.y))
          .serialize(),
        centered: false,
      },
      false,
    ),
  );

  const innerRight = Math.max(
    innerOrigin.x,
    ...nodes.map((node) => innerOrigin.x + node.position.x + node.size.x),
  );

  canvas.addNode(
    terminal(
      INPUTS_TERMINAL_ID,
      "inputs",
      definition.inputs,
      Vec2.of(MARGIN, MARGIN),
    ),
    false,
  );
  canvas.addNode(
    terminal(
      OUTPUTS_TERMINAL_ID,
      "outputs",
      definition.outputs,
      Vec2.of(innerRight + TERMINAL_GAP, MARGIN),
    ),
    false,
  );

  // Groups the type was saved with, e.g. ones made in this editor.
  definition.groups?.forEach(({ nodeIds, ...group }) =>
    canvas.addGroup(nodeIds, group, false),
  );

  definition.connections.forEach((connection) =>
    canvas.addConnection(connection, false),
  );

  definition.inputs.forEach((port, i) =>
    getCompositePortTargets(port).forEach((target) =>
      canvas.addConnection(
        {
          sourceNodeId: INPUTS_TERMINAL_ID,
          sourceConnectorId: `port-${i}`,
          destinationNodeId: target.innerNodeId,
          destinationConnectorId: target.innerConnectorId,
          css: { ...WIRE_CSS },
        },
        false,
      ),
    ),
  );

  definition.outputs.forEach((port, i) =>
    canvas.addConnection(
      {
        sourceNodeId: port.innerNodeId,
        sourceConnectorId: port.innerConnectorId,
        destinationNodeId: OUTPUTS_TERMINAL_ID,
        destinationConnectorId: `port-${i}`,
        css: { ...WIRE_CSS },
      },
      false,
    ),
  );

  markCircuitDirty();
};

export const closeChipEditor = () => {
  editorSession.value = undefined;
  markCircuitDirty();
};

export const renameEditedType = (name: string) => {
  const current = editorSession.value;
  if (current) editorSession.value = { ...current, name };
};

/** Whether any node in `nodes`, or nested inside one, is of type `templateId`. */
const containsType = (
  nodes: Iterable<SerializedNodeflowNode>,
  templateId: string,
): boolean =>
  Array.from(nodes).some(
    (node) =>
      node.customData?.templateId === templateId ||
      (node.composite !== undefined &&
        containsType(Object.values(node.composite.nodes), templateId)),
  );

/**
 * Saved types that cannot be placed in the editor: the edited type itself and
 * any type built from it, so a chip never ends up inside itself.
 */
export const isTypeLockedInEditor = (templateId: string): boolean => {
  const current = editorSession.value;
  if (!current) return false;
  if (templateId === current.templateId) return true;
  const template = getMainCanvas().templates.get(templateId);
  return (
    template !== undefined &&
    containsType(Object.values(template.definition.nodes), current.templateId)
  );
};

/**
 * Why the edited type cannot be saved yet; empty when it can be. Unwired
 * inner inputs are fine (they read low), but the chip needs an output pin.
 */
export const validateEditor = (canvas: NodeflowData): Array<string> => {
  const problems: Array<string> = [];

  const passThrough = canvas.nodes
    .get(INPUTS_TERMINAL_ID)
    ?.getAllDestinationConnections()
    .some((wire) => wire.destinationNodeId === OUTPUTS_TERMINAL_ID);
  if (passThrough) {
    problems.push("Inputs cannot be wired straight to outputs");
  }

  const usedOutputs = canvas.nodes
    .get(OUTPUTS_TERMINAL_ID)
    ?.getAllSourceConnections().length;
  if (!usedOutputs) problems.push("Connect at least one output pin");

  return problems;
};

/** The edited graph as a composite definition, without unused pins. */
const buildDefinition = (
  canvas: NodeflowData,
): SerializedCompositeDefinition => {
  const inner = innerNodes(canvas);
  const innerIds = new Set(inner.map((node) => node.id));
  const origin = Vec2.of(
    Math.min(...inner.map((node) => node.position.x)),
    Math.min(...inner.map((node) => node.position.y)),
  );

  const nodes = Object.fromEntries(
    inner.map((node) => {
      const serialized = node.serialize();
      serialized.position = node.position.subtract(origin).serialize();
      serialized.centered = false;
      return [node.id, serialized];
    }),
  );

  const connections = inner.flatMap((node) =>
    node
      .getAllDestinationConnections()
      .filter((connection) => innerIds.has(connection.destinationNodeId)),
  );

  const portName = (terminalId: string, portId: string) =>
    canvas.nodes.get(terminalId)?.customData.portNames?.[portId]?.trim() ||
    undefined;

  const portIds = (terminalId: string, sectionId: string) =>
    Array.from(
      canvas.nodes.get(terminalId)?.connectorSections.get(sectionId)
        ?.connectors.keys() ?? [],
    );

  const inputWires =
    canvas.nodes.get(INPUTS_TERMINAL_ID)?.getAllDestinationConnections() ?? [];
  const inputs: Array<CompositePort> = [];
  portIds(INPUTS_TERMINAL_ID, "outputs").forEach((portId) => {
    const [first, ...rest] = inputWires
      .filter(
        (wire) =>
          wire.sourceConnectorId === portId &&
          innerIds.has(wire.destinationNodeId),
      )
      .map((wire) => ({
        innerNodeId: wire.destinationNodeId,
        innerConnectorId: wire.destinationConnectorId,
      }));
    // Unused pins are dropped.
    if (!first) return;
    const name = portName(INPUTS_TERMINAL_ID, portId);
    inputs.push({
      id: `input-${inputs.length}`,
      ...(name && { name }),
      ...first,
      ...(rest.length > 0 && { extraTargets: rest }),
    });
  });

  const outputWires =
    canvas.nodes.get(OUTPUTS_TERMINAL_ID)?.getAllSourceConnections() ?? [];
  const outputs: Array<CompositePort> = [];
  portIds(OUTPUTS_TERMINAL_ID, "inputs").forEach((portId) => {
    const wire = outputWires.find(
      (candidate) =>
        candidate.destinationConnectorId === portId &&
        innerIds.has(candidate.sourceNodeId),
    );
    if (!wire) return;
    const name = portName(OUTPUTS_TERMINAL_ID, portId);
    outputs.push({
      id: `output-${outputs.length}`,
      ...(name && { name }),
      innerNodeId: wire.sourceNodeId,
      innerConnectorId: wire.sourceConnectorId,
    });
  });

  // Groups of inner nodes are kept; terminals never belong in one.
  const groups = Array.from(canvas.groups.values())
    .map((group) => group.serialize())
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id) => innerIds.has(id)),
    }))
    .filter((group) => group.nodeIds.length > 0);

  return {
    nodes,
    connections,
    inputs,
    outputs,
    ...(groups.length > 0 && { groups }),
  };
};

/**
 * Saves the edited type and updates every instance of it on the main canvas.
 * Instances nested inside other saved types keep their old definition.
 * Returns whether it saved.
 */
export const saveChipEdit = (): boolean => {
  const canvas = editorCanvas.value;
  const current = editorSession.value;
  const main = getMainCanvas();
  const template = current && main.templates.get(current.templateId);
  if (!canvas || !current || !template || validateEditor(canvas).length > 0) {
    return false;
  }

  const name = current.name.trim() || template.name;
  const definition = buildDefinition(canvas);

  main.templates.add(
    normalizeTemplate({
      ...template,
      name,
      definition,
      node: {
        ...template.node,
        customData: {
          ...(template.node.customData ?? { type: "chip" }),
          name,
          templateId: template.id,
        },
        connectorSections: createCompositeSections(
          definition,
          CHIP_SECTION_OPTIONS,
        ),
      },
    }),
  );

  const historyGroup = Changes.createHistoryGroup();
  Array.from(main.nodes.values())
    .filter(
      (node) => node.composite && node.customData.templateId === template.id,
    )
    .forEach((node) => {
      // Chips renamed by hand keep their name; the rest follow the type.
      const followsType = node.customData.name === template.name;
      const updated = main.updateCompositeNode(
        node.id,
        definition,
        CHIP_SECTION_OPTIONS,
        historyGroup,
      );
      if (updated && followsType) {
        updated.customData = { ...updated.customData, name };
      }
    });

  closeChipEditor();
  return true;
};

/** Problems with the edited type, re-checked as the editor canvas changes. */
export const useEditorProblems = (contentRevision: { value: number }) =>
  computed(() => {
    void contentRevision.value;
    const canvas = editorCanvas.value;
    return canvas ? validateEditor(canvas) : [];
  });
