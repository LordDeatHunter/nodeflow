import {
  NodeflowData,
  NodeflowNodeData,
  SerializedCompositeDefinition,
} from "@nodeflow-lib/solid";
import { blueprintRevision } from "./reactivity";

export type Operator = NonNullable<CustomNodeflowDataType["operator"]>;

/** The `degree`-th root of `value`, keeping odd roots of negatives real. */
const root = (value: number, degree: number): number =>
  value < 0 && Number.isInteger(degree) && degree % 2 !== 0
    ? -Math.pow(-value, 1 / degree)
    : Math.pow(value, 1 / degree);

const applyOperator = (operator: Operator, a: number, b: number): number => {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "%":
      return a % b;
    case "^":
      return Math.pow(a, b);
    case "√":
      return root(a, b);
  }
};

interface GraphNode {
  customData: CustomNodeflowDataType;
  composite?: SerializedCompositeDefinition;
}

interface Source {
  graph: Graph;
  nodeId: string;
  connectorId: string;
}

/**
 * A graph to evaluate: the live canvas, or the inner graph of a derived node.
 * Lets derived nodes be evaluated without breaking them apart.
 */
interface Graph {
  /** Unique per derived-node instance, for cycle detection. */
  scope: string;
  getNode(nodeId: string): GraphNode | undefined;
  /** Input connector ids, in order (order matters for -, /, %, ^ and √). */
  getInputIds(nodeId: string): Array<string>;
  /** The output feeding `inputId`, possibly in an enclosing graph. */
  getSource(nodeId: string, inputId: string): Source | undefined;
}

const liveGraph = (nodeflow: NodeflowData): Graph => {
  const graph: Graph = {
    scope: "",
    getNode: (nodeId) => nodeflow.nodes.get(nodeId),
    getInputIds: (nodeId) =>
      Array.from(
        nodeflow.nodes.get(nodeId)?.connectorSections.get("inputs")?.connectors
          .keys() ?? [],
      ),
    getSource: (nodeId, inputId) => {
      const source = nodeflow.nodes.get(nodeId)?.getConnector(inputId)
        ?.sources.get(0)?.sourceConnector;
      return source
        ? { graph, nodeId: source.parentNode.id, connectorId: source.id }
        : undefined;
    },
  };
  return graph;
};

/**
 * The inner graph of derived node `nodeId` in `outer`. Inner inputs exposed
 * as the derived node's inputs read from whatever feeds those inputs outside.
 */
const definitionGraph = (
  definition: SerializedCompositeDefinition,
  outer: Graph,
  nodeId: string,
): Graph => {
  const graph: Graph = {
    scope: `${outer.scope}/${nodeId}`,
    getNode: (innerId) => definition.nodes[innerId],
    getInputIds: (innerId) =>
      Object.keys(
        definition.nodes[innerId]?.connectorSections.inputs?.connectors ?? {},
      ),
    getSource: (innerId, inputId) => {
      const connection = definition.connections.find(
        (candidate) =>
          candidate.destinationNodeId === innerId &&
          candidate.destinationConnectorId === inputId,
      );
      if (connection) {
        return {
          graph,
          nodeId: connection.sourceNodeId,
          connectorId: connection.sourceConnectorId,
        };
      }

      const port = definition.inputs.find(
        (candidate) =>
          candidate.innerNodeId === innerId &&
          candidate.innerConnectorId === inputId,
      );
      return port ? outer.getSource(nodeId, port.id) : undefined;
    },
  };
  return graph;
};

const getSources = (graph: Graph, nodeId: string): Array<Source> =>
  graph.getInputIds(nodeId).flatMap((inputId) => {
    const source = graph.getSource(nodeId, inputId);
    return source ? [source] : [];
  });

/**
 * The value on `outputId` of a node. `visiting` holds the nodes on the
 * current path, so cycles yield `undefined` while a node feeding several
 * inputs is still evaluated each time.
 */
const evaluate = (
  graph: Graph,
  nodeId: string,
  outputId: string | undefined,
  visiting: Set<string>,
): number | undefined => {
  const key = `${graph.scope}:${nodeId}:${outputId}`;
  if (visiting.has(key)) return undefined;

  const node = graph.getNode(nodeId);
  if (!node) return undefined;

  visiting.add(key);
  try {
    const data = node.customData;
    const valueOf = (source: Source) =>
      evaluate(source.graph, source.nodeId, source.connectorId, visiting);

    switch (data.type) {
      case "number":
        return data.value ?? 0;
      case "operation": {
        const sources = getSources(graph, nodeId);
        if (sources.length === 0) return undefined;

        const values = sources.map(valueOf);
        if (values.some((value) => value === undefined)) return undefined;

        const [first, ...rest] = values as number[];
        const operator = data.operator ?? "+";
        // A lone input to √ is a square root; otherwise input 2 is the degree.
        if (operator === "√" && rest.length === 0) return Math.sqrt(first);
        return rest.reduce(
          (total, value) => applyOperator(operator, total, value),
          first,
        );
      }
      case "negation": {
        const [source] = getSources(graph, nodeId);
        const value = source ? valueOf(source) : undefined;
        return value === undefined ? undefined : -value;
      }
      case "plusMinus": {
        // Top output is the positive value, bottom output the negative one.
        const [source] = getSources(graph, nodeId);
        const value = source ? valueOf(source) : undefined;
        if (value === undefined) return undefined;
        return outputId === "output-1" ? -Math.abs(value) : Math.abs(value);
      }
      case "display": {
        const [source] = getSources(graph, nodeId);
        return source ? valueOf(source) : undefined;
      }
      case "derived": {
        const definition = node.composite;
        const port = definition?.outputs.find(
          (candidate) => candidate.id === outputId,
        );
        if (!definition || !port) return undefined;

        return evaluate(
          definitionGraph(definition, graph, nodeId),
          port.innerNodeId,
          port.innerConnectorId,
          visiting,
        );
      }
    }
  } finally {
    visiting.delete(key);
  }
};

/** The value a display node shows. */
export const getNodeValue = (node: NodeflowNodeData): number | undefined => {
  blueprintRevision();
  return evaluate(liveGraph(node.nodeflow), node.id, undefined, new Set());
};

/** The value on one output of a node. */
export const getOutputValue = (
  node: NodeflowNodeData,
  outputId: string,
): number | undefined => {
  blueprintRevision();
  return evaluate(liveGraph(node.nodeflow), node.id, outputId, new Set());
};

export const formatValue = (value: number): string =>
  JSON.stringify(Number(value.toFixed(2)));
