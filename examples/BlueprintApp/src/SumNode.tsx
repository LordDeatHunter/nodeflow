import { Component, createEffect, createMemo, createSignal } from "solid-js";
import { NodeflowNodeData, Optional } from "nodeflow-lib";
import OutputData from "./OutputData";

const SumNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const [operator, setOperator] = createSignal("+");

  const sum = createMemo(() => {
    let sum;
    switch (operator()) {
      case "*":
      case "/":
        sum = 1;
        break;
      default:
        sum = 0;
        break;
    }

    const keys = props.node.connectorSections.get("inputs")?.connectors?.keys();

    for (const key of keys ?? []) {
      const source = props.node.getConnector(key)?.sources.get(0);

      if (!source) {
        return;
      }
      const data = source.sourceConnector.customData as Optional<
        OutputData<number>
      >;

      switch (operator()) {
        case "+":
          sum += data?.value ?? 0;
          break;
        case "-":
          sum -= data?.value ?? 0;
          break;
        case "*":
          sum *= data?.value ?? 0;
          break;
        case "/":
          sum /= data?.value ?? 0;
          break;
      }
    }

    return sum;
  });

  createEffect(() => {
    const output = props.node.getConnector("output-0");
    if (output) {
      output.customData = new OutputData("number", sum());
    }
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
        onChange={(event) => setOperator(event.currentTarget.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <option value="+">+</option>
        <option value="-">-</option>
        <option value="*">*</option>
        <option value="/">/</option>
      </select>
    </div>
  );
};

export default SumNode;
