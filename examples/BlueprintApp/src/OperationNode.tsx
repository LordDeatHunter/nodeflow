import { Component, createEffect, createMemo, onMount } from "solid-js";
import { CustomNodeData, NodeflowNodeData, Optional } from "nodeflow-lib";
import NumberConnector from "./data/NumberConnector";

export type Operator = "+" | "-" | "*" | "/" | "%";

export class OperationNodeData extends CustomNodeData {
  public readonly operator: Operator;

  constructor(operator: Operator) {
    super();
    this.operator = operator;
  }

  public serialize(): CustomNodeflowDataType {
    return {
      value: this.operator,
      type: "operation",
    };
  }
}

const OperationNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const operator = createMemo(
    () => (props.node.customData as OperationNodeData).operator,
  );
  const setOperator = (value: Operator) => {
    props.node.customData = new OperationNodeData(value);
  };

  const result = createMemo(() => {
    let result = undefined;
    const keys = props.node.connectorSections.get("inputs")?.connectors?.keys();

    for (const key of keys ?? []) {
      const source = props.node.getConnector(key)?.sources.get(0);

      if (!source) {
        return;
      }
      const data = source.sourceConnector
        .customData as Optional<NumberConnector>;

      if (result === undefined) {
        result = data?.value ?? 0;
        continue;
      }

      switch (operator()) {
        case "+":
          result += data?.value ?? 0;
          break;
        case "-":
          result -= data?.value ?? 0;
          break;
        case "*":
          result *= data?.value ?? 0;
          break;
        case "/":
          result /= data?.value ?? 0;
          break;
        case "%":
          result %= data?.value ?? 0;
          break;
      }
    }

    return result;
  });

  createEffect(() => {
    const output = props.node.getConnector("output-0");
    if (output) {
      output.customData = new NumberConnector(result());
    }
  });

  onMount(() => {
    setOperator(operator() ?? "+");
  });

  return (
    <div
      style={{
        padding: "2rem",
      }}
    >
      <h2 style={{ margin: "0 0 1rem 0" }}>Operation Node</h2>
      <select
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "3px solid #202E37",
          "border-radius": "0.5rem",
          "box-sizing": "border-box",
          "font-size": "2rem",
          "background-color": "#819796",
          color: "#202E37",
        }}
        value={operator()}
        onChange={(event) => setOperator(event.currentTarget.value as Operator)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <option value="+">+</option>
        <option value="-">-</option>
        <option value="*">*</option>
        <option value="/">/</option>
        <option value="%">%</option>
      </select>
    </div>
  );
};

export default OperationNode;
