import { Component, createComponent, createSignal } from "solid-js";
import {
  Changes,
  CompositePort,
  createCompositeSections,
  createSolidNodeflow,
  getCompositePortTargets,
  NodeflowData,
  NodeflowNodeData,
  SerializedCompositeDefinition,
  SerializedNodeflowNode,
  Vec2,
} from "@nodeflow-lib/solid";
import { BPCurveFunctions } from "./BPCurveFunctions";
import { BLUEPRINT_SETTINGS, GRID_SIZE } from "./settings";
import {
  connectionCss,
  DERIVED_SECTION_OPTIONS,
  resolveNodeDisplay,
  setupEvents,
} from "./utils";
import { connectorNumber, describeNodeKind } from "./labels";
import { markBlueprintDirty } from "./reactivity";
import { nodeflowData } from "./App";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import nodeflowCss from "./styles/nodeflow.module.scss";

/**
 * The nested canvas a saved derived type is edited on. It shows the type's
 * inner nodes between two terminals standing for the type's ports.
 */
const [canvasData, Canvas] = createSolidNodeflow(
  "derived-type-editor",
  {
    ...BLUEPRINT_SETTINGS,
    resolveNodeDisplay: (node) => resolveNodeDisplay(node),
  },
  (nodeflow: NodeflowData) => new BPCurveFunctions(nodeflow),
);

export const editorData = canvasData;

/** The editor canvas, filling its container. */
export const EditorCanvas: Component = () =>
  createComponent(Canvas, {
    css: {
      getNewCurveCss: () => curveCss.newConnection,
      nodeflow: nodeflowCss.nodeflow,
    },
    height: "100%",
    width: "100%",
  });

export const INPUTS_TERMINAL_ID = "__terminal-inputs";
export const OUTPUTS_TERMINAL_ID = "__terminal-outputs";

const TERMINAL_WIDTH = 216;
const TERMINAL_GAP = GRID_SIZE * 5;
const MARGIN = GRID_SIZE * 2;

export interface EditorSession {
  templateId: string;
  name: string;
}

const [session, setSession] = createSignal<EditorSession | undefined>();
export const editorSession = session;

let eventsReady = false;

const isTerminal = (node: NodeflowNodeData) =>
  node.customData.type === "terminal";

/** Keeps the terminals out of a Delete: only inner nodes can be removed. */
const protectTerminals = () =>
  editorData.eventStore.onKeyDownInNodeflow.subscribe(
    "blueprint:protect-terminals",
    ({ event }) => {
      if (event.code === "Delete") editorData.mouseData.deleteNodes(isTerminal);
    },
    // Runs before core's own Delete handling.
    10,
  );

const innerNodes = () =>
  Array.from(editorData.nodes.values()).filter((node) => !isTerminal(node));

/** Empties the editor canvas, its selection and its undo history. */
const resetEditor = () => {
  const current = editorData.serialize();
  editorData.deserialize({
    ...current,
    nodes: {},
    connections: [],
    groups: {},
    mouseData: { selections: {} },
    changes: { ...current.changes, changes: [], currentChangeIndex: -1 },
    position: { x: 0, y: 0 },
    zoomLevel: 1,
  });
};

const terminal = (
  id: string,
  side: "inputs" | "outputs",
  portCount: number,
  position: Vec2,
): Partial<SerializedNodeflowNode> => {
  // The inputs terminal offers its ports as outputs, and vice versa.
  const sectionId = side === "inputs" ? "outputs" : "inputs";
  return {
    id,
    position: position.serialize(),
    centered: false,
    css: {
      normal: `${nodeCss.node} ${nodeCss.terminalNode}`,
      selected: nodeCss.selectedNode,
    },
    customData: { type: "terminal", side },
    connectorSections: {
      [sectionId]: {
        id: sectionId,
        css: `${
          side === "inputs" ? nodeCss.outputsSection : nodeCss.inputsSection
        } ${nodeCss.terminalSection}`,
        connectors: Object.fromEntries(
          Array.from({ length: portCount }, (_, i) => [
            `port-${i}`,
            {
              id: `port-${i}`,
              css:
                side === "inputs"
                  ? nodeCss.outputConnector
                  : nodeCss.inputConnector,
              hovered: false,
              position: { x: 0, y: 0 },
            },
          ]),
        ),
      },
    },
  };
};

/**
 * Opens saved type `templateId` in the editor. The terminals start with the
 * type's current ports, wired as they are, so saving right away changes
 * nothing.
 */
export const openTemplateEditor = (templateId: string) => {
  const template = nodeflowData.templates.get(templateId);
  if (!template) return;

  if (!eventsReady) {
    setupEvents(editorData);
    protectTerminals();
    eventsReady = true;
  }

  resetEditor();
  const { definition } = template;
  const nodes = Object.values(definition.nodes);
  const innerOrigin = Vec2.of(MARGIN + TERMINAL_WIDTH + TERMINAL_GAP, MARGIN);

  nodes.forEach((node) =>
    editorData.addNode(
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

  editorData.addNode(
    terminal(
      INPUTS_TERMINAL_ID,
      "inputs",
      definition.inputs.length,
      Vec2.of(MARGIN, MARGIN),
    ),
    false,
  );
  editorData.addNode(
    terminal(
      OUTPUTS_TERMINAL_ID,
      "outputs",
      definition.outputs.length,
      Vec2.of(innerRight + TERMINAL_GAP, MARGIN),
    ),
    false,
  );

  definition.connections.forEach((connection) =>
    editorData.addConnection(connection, false),
  );

  definition.inputs.forEach((port, i) =>
    getCompositePortTargets(port).forEach((target) =>
      editorData.addConnection(
        {
          sourceNodeId: INPUTS_TERMINAL_ID,
          sourceConnectorId: `port-${i}`,
          destinationNodeId: target.innerNodeId,
          destinationConnectorId: target.innerConnectorId,
          css: connectionCss,
        },
        false,
      ),
    ),
  );

  definition.outputs.forEach((port, i) =>
    editorData.addConnection(
      {
        sourceNodeId: port.innerNodeId,
        sourceConnectorId: port.innerConnectorId,
        destinationNodeId: OUTPUTS_TERMINAL_ID,
        destinationConnectorId: `port-${i}`,
        css: connectionCss,
      },
      false,
    ),
  );

  setSession({ templateId, name: template.name });
  markBlueprintDirty();
};

export const closeTemplateEditor = () => {
  setSession(undefined);
  resetEditor();
  markBlueprintDirty();
};

export const renameEditedType = (name: string) => {
  const current = session();
  if (current) setSession({ ...current, name });
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
 * any type built from it, so a type never ends up inside itself.
 */
export const isTypeLockedInEditor = (templateId: string): boolean => {
  const current = session();
  if (!current) return false;
  if (templateId === current.templateId) return true;
  const template = nodeflowData.templates.get(templateId);
  return (
    template !== undefined &&
    containsType(Object.values(template.definition.nodes), current.templateId)
  );
};

/**
 * Why the edited type cannot be saved yet: every inner connector must be
 * wired, and at least one output port must be used. Empty when it can be.
 */
export const validateEditor = (): Array<string> => {
  const problems: Array<string> = [];

  innerNodes().forEach((node) => {
    const kind = describeNodeKind(node.customData);
    node.connectorSections.get("inputs")?.connectors.forEach((connector) => {
      if (connector.sources.length === 0) {
        problems.push(
          `${kind} · in ${connectorNumber(connector.id)} is not connected`,
        );
      }
    });
    node.connectorSections.get("outputs")?.connectors.forEach((connector) => {
      if (connector.destinations.length === 0) {
        problems.push(
          `${kind} · out ${connectorNumber(connector.id)} is not connected`,
        );
      }
    });
  });

  const passThrough = editorData.nodes
    .get(INPUTS_TERMINAL_ID)
    ?.getAllDestinationConnections()
    .some((wire) => wire.destinationNodeId === OUTPUTS_TERMINAL_ID);
  if (passThrough) {
    problems.push("Inputs cannot be wired straight to outputs");
  }

  const usedOutputs = editorData.nodes
    .get(OUTPUTS_TERMINAL_ID)
    ?.getAllSourceConnections().length;
  if (!usedOutputs) problems.push("Connect at least one output port");

  return problems;
};

/** The edited graph as a composite definition, without unused ports. */
const buildDefinition = (): SerializedCompositeDefinition => {
  const inner = innerNodes();
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

  const portIds = (terminalId: string, sectionId: string) =>
    Array.from(
      editorData.nodes
        .get(terminalId)
        ?.connectorSections.get(sectionId)
        ?.connectors.keys() ?? [],
    );

  const inputWires =
    editorData.nodes.get(INPUTS_TERMINAL_ID)?.getAllDestinationConnections() ??
    [];
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
    // Unused ports are dropped.
    if (!first) return;
    inputs.push({
      id: `input-${inputs.length}`,
      ...first,
      ...(rest.length > 0 && { extraTargets: rest }),
    });
  });

  const outputWires =
    editorData.nodes.get(OUTPUTS_TERMINAL_ID)?.getAllSourceConnections() ?? [];
  const outputs: Array<CompositePort> = [];
  portIds(OUTPUTS_TERMINAL_ID, "inputs").forEach((portId) => {
    const wire = outputWires.find(
      (candidate) =>
        candidate.destinationConnectorId === portId &&
        innerIds.has(candidate.sourceNodeId),
    );
    if (!wire) return;
    outputs.push({
      id: `output-${outputs.length}`,
      innerNodeId: wire.sourceNodeId,
      innerConnectorId: wire.sourceConnectorId,
    });
  });

  return { nodes, connections, inputs, outputs };
};

/**
 * Saves the edited type and updates every instance of it on the main canvas.
 * Instances nested inside other saved types keep their old definition.
 * Returns whether it saved.
 */
export const saveTemplateEdit = (): boolean => {
  const current = session();
  const template = current && nodeflowData.templates.get(current.templateId);
  if (!current || !template || validateEditor().length > 0) return false;

  const name = current.name.trim() || template.name;
  const definition = buildDefinition();

  nodeflowData.templates.add({
    ...template,
    name,
    definition,
    node: {
      ...template.node,
      customData: {
        ...(template.node.customData ?? { type: "derived" }),
        name,
        templateId: template.id,
      },
      connectorSections: createCompositeSections(
        definition,
        DERIVED_SECTION_OPTIONS,
      ),
    },
  });

  const historyGroup = Changes.createHistoryGroup();
  Array.from(nodeflowData.nodes.values())
    .filter(
      (node) => node.composite && node.customData.templateId === template.id,
    )
    .forEach((node) => {
      // Instances renamed by hand keep their name; the rest follow the type.
      const followsType = node.customData.name === template.name;
      const updated = nodeflowData.updateCompositeNode(
        node.id,
        definition,
        DERIVED_SECTION_OPTIONS,
        historyGroup,
      );
      if (updated && followsType) {
        updated.customData = { ...updated.customData, name };
      }
    });

  closeTemplateEditor();
  return true;
};
