import Vec2 from "./Vec2";
import { deepCopy } from "./misc-utils";
import type NodeflowData from "./NodeflowData";
import type NodeflowNodeData from "./NodeflowNodeData";
import type NodeConnector from "./NodeConnector";
import type { DisplayFunc } from "./types";
import type {
  CompositePort,
  CompositePortTarget,
  SelectableElementCSS,
  SerializedCompositeDefinition,
  SerializedConnection,
  SerializedConnectorSection,
  SerializedNodeflowNode,
} from "./nodeflow-types";

export interface CompositeNodeOptions {
  /** Where the composite node goes. Defaults to the selection's top-left. */
  position?: Vec2;
  css?: SelectableElementCSS;
  customData?: CustomNodeflowDataType;
  /** Falls back to `settings.resolveNodeDisplay`. */
  display?: DisplayFunc;
  /** Section holding the exposed inputs. Id defaults to `"inputs"`. */
  inputSection?: { id?: string; css?: string };
  /** Section holding the exposed outputs. Id defaults to `"outputs"`. */
  outputSection?: { id?: string; css?: string };
  connectorCss?: { input?: string; output?: string };
  /**
   * Whether a connector of an inner node is an input (receives connections).
   * Defaults to `defaultIsInputConnector`.
   */
  isInput?: (connector: NodeConnector) => boolean;
}

/**
 * A connector with incoming connections is an input and one with outgoing
 * connections is an output. An unconnected connector is an input unless its
 * section id mentions "out".
 */
export const defaultIsInputConnector = (connector: NodeConnector): boolean => {
  if (connector.sources.length > 0) return true;
  if (connector.destinations.length > 0) return false;
  return !/out/i.test(connector.parentSection.id);
};

/** A connection between the selection and the outside, keyed to a port. */
export interface ExternalCompositeConnection {
  /** The original connection. */
  connection: SerializedConnection;
  side: "input" | "output";
  port: CompositePort;
}

export interface CompositeSelectionAnalysis {
  /** Top-left of the selection; inner positions are relative to it. */
  origin: Vec2;
  definition: SerializedCompositeDefinition;
  external: Array<ExternalCompositeConnection>;
}

/**
 * Works out which connectors of `nodeIds` a composite node built from them
 * exposes. An input is exposed when it is unconnected or fed from outside the
 * selection; an output when it is unconnected or feeds something outside.
 * Ports are ordered by node position (top to bottom, then left to right),
 * then connector order, so the result is deterministic.
 */
export const analyzeCompositeSelection = (
  nodeflow: NodeflowData,
  nodeIds: Iterable<string>,
  isInput: (connector: NodeConnector) => boolean = defaultIsInputConnector,
): CompositeSelectionAnalysis | undefined => {
  const ids = new Set(
    Array.from(nodeIds).filter((id) => nodeflow.nodes.has(id)),
  );
  if (ids.size === 0) return undefined;

  const nodes = Array.from(ids)
    .map((id) => nodeflow.nodes.get(id)!)
    .sort(
      (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
    );

  const origin = Vec2.of(
    Math.min(...nodes.map((node) => node.position.x)),
    Math.min(...nodes.map((node) => node.position.y)),
  );

  const definition: SerializedCompositeDefinition = {
    nodes: {},
    connections: [],
    inputs: [],
    outputs: [],
  };
  const external: Array<ExternalCompositeConnection> = [];

  nodes.forEach((node) => {
    const serialized = node.serialize();
    serialized.position = node.position.subtract(origin).serialize();
    serialized.centered = false;
    definition.nodes[node.id] = serialized;

    const incoming = node.getAllSourceConnections();
    const outgoing = node.getAllDestinationConnections();

    outgoing
      .filter((connection) => ids.has(connection.destinationNodeId))
      .forEach((connection) => definition.connections.push(connection));

    node.getAllConnectors().forEach((connector) => {
      const inputLike = isInput(connector);

      const externalIn = incoming.filter(
        (connection) =>
          connection.destinationConnectorId === connector.id &&
          !ids.has(connection.sourceNodeId),
      );
      const externalOut = outgoing.filter(
        (connection) =>
          connection.sourceConnectorId === connector.id &&
          !ids.has(connection.destinationNodeId),
      );

      const exposeInput =
        externalIn.length > 0 ||
        (inputLike && connector.sources.length === 0);
      const exposeOutput =
        externalOut.length > 0 ||
        (!inputLike && connector.destinations.length === 0);

      if (exposeInput) {
        const port: CompositePort = {
          id: `input-${definition.inputs.length}`,
          innerNodeId: node.id,
          innerConnectorId: connector.id,
        };
        definition.inputs.push(port);
        externalIn.forEach((connection) =>
          external.push({ connection, side: "input", port }),
        );
      }

      if (exposeOutput) {
        const port: CompositePort = {
          id: `output-${definition.outputs.length}`,
          innerNodeId: node.id,
          innerConnectorId: connector.id,
        };
        definition.outputs.push(port);
        externalOut.forEach((connection) =>
          external.push({ connection, side: "output", port }),
        );
      }
    });
  });

  return { origin, definition, external };
};

/** Connector sections a composite node gets for `definition`'s ports. */
export const createCompositeSections = (
  definition: SerializedCompositeDefinition,
  options: Pick<
    CompositeNodeOptions,
    "inputSection" | "outputSection" | "connectorCss"
  > = {},
): Record<string, SerializedConnectorSection> => {
  const section = (
    id: string,
    css: string | undefined,
    ports: Array<CompositePort>,
    connectorCss: string | undefined,
  ): SerializedConnectorSection => ({
    id,
    css,
    connectors: Object.fromEntries(
      ports.map((port) => [
        port.id,
        {
          id: port.id,
          css: connectorCss,
          hovered: false,
          position: { x: 0, y: 0 },
        },
      ]),
    ),
  });

  const inputId = options.inputSection?.id ?? "inputs";
  const outputId = options.outputSection?.id ?? "outputs";

  return {
    [inputId]: section(
      inputId,
      options.inputSection?.css,
      definition.inputs,
      options.connectorCss?.input,
    ),
    [outputId]: section(
      outputId,
      options.outputSection?.css,
      definition.outputs,
      options.connectorCss?.output,
    ),
  };
};

/**
 * Picks ids for a composite's inner nodes that are free in `nodeflow`, keeping
 * the original id where possible.
 */
export const allocateInnerNodeIds = (
  nodeflow: NodeflowData,
  innerIds: Array<string>,
): Map<string, string> => {
  const taken = new Set(nodeflow.nodes.keys());
  const idMap = new Map<string, string>();

  // Keep every original id that is still free before handing out new ones, so
  // a fresh id never steals one a later inner node wanted.
  innerIds.forEach((id) => {
    if (taken.has(id)) return;
    idMap.set(id, id);
    taken.add(id);
  });

  let counter = 0;
  innerIds.forEach((id) => {
    if (idMap.has(id)) return;
    while (taken.has(counter.toString())) ++counter;
    const fresh = counter.toString();
    idMap.set(id, fresh);
    taken.add(fresh);
  });

  return idMap;
};

/** Removes `display` from every node of a definition, including nested ones. */
export const stripDefinitionDisplay = (
  definition: SerializedCompositeDefinition,
): SerializedCompositeDefinition => ({
  ...definition,
  nodes: Object.fromEntries(
    Object.entries(definition.nodes).map(([id, node]) => [
      id,
      stripNodeDisplay(node),
    ]),
  ),
});

export const stripNodeDisplay = <T extends Partial<SerializedNodeflowNode>>(
  node: T,
): T => {
  const { display: _display, composite, ...rest } = node;
  return {
    ...deepCopy(rest),
    ...(composite && { composite: stripDefinitionDisplay(composite) }),
  } as T;
};

/** Every inner connector a port maps to: its main target, then extras. */
export const getCompositePortTargets = (
  port: CompositePort,
): Array<CompositePortTarget> => [
  { innerNodeId: port.innerNodeId, innerConnectorId: port.innerConnectorId },
  ...(port.extraTargets ?? []),
];

/** The inner node a composite's port maps to, if any. */
export const getCompositePort = (
  node: NodeflowNodeData,
  connectorId: string,
): CompositePort | undefined =>
  node.composite?.inputs.find((port) => port.id === connectorId) ??
  node.composite?.outputs.find((port) => port.id === connectorId);
