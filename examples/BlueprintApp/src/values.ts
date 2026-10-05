import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision } from "./reactivity";

export type Operator = "+" | "-" | "*" | "/" | "%";

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
  }
};

// Ordered by connector id so order-sensitive operators (-, /, %) are stable.
const getInputSources = (node: NodeflowNodeData): NodeflowNodeData[] => {
  const section = node.connectorSections.get("inputs");
  if (!section) return [];

  return Array.from(section.connectors.values()).flatMap((connector) => {
    const source = connector.sources.get(0);
    return source ? [source.sourceConnector.parentNode as NodeflowNodeData] : [];
  });
};

export const getNodeValue = (
  node: NodeflowNodeData,
): number | undefined => {
  blueprintRevision();
  return resolveValue(node, new Set());
};

const resolveValue = (
  node: NodeflowNodeData,
  visited: Set<string>,
): number | undefined => {
  if (visited.has(node.id)) {
    return undefined;
  }
  visited.add(node.id);

  const data = node.customData;

  switch (data.type) {
    case "number":
      return data.value ?? 0;
    case "operation": {
      const sources = getInputSources(node);
      if (sources.length === 0) {
        return undefined;
      }

      const values = sources.map((source) => resolveValue(source, visited));
      if (values.some((value) => value === undefined)) {
        return undefined;
      }

      const [first, ...rest] = values as number[];
      const operator = data.operator ?? "+";
      return rest.reduce(
        (total, value) => applyOperator(operator, total, value),
        first,
      );
    }
    case "display": {
      const [source] = getInputSources(node);
      return source ? resolveValue(source, visited) : undefined;
    }
  }
};

export const formatValue = (value: number): string =>
  JSON.stringify(Number(value.toFixed(2)));
