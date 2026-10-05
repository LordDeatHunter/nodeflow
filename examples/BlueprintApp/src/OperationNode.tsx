import { Component, createMemo } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";
import { Operator } from "./values";

const OPERATORS: Operator[] = ["+", "-", "*", "/", "%"];

const selectStyle = {
  width: "100%",
  padding: "0.5rem",
  border: "3px solid #202E37",
  "border-radius": "0.5rem",
  "box-sizing": "border-box",
  "font-size": "2rem",
  "background-color": "#819796",
  color: "#202E37",
};

const OperationNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const operator = createMemo(() => {
    blueprintRevision();
    return props.node.customData.operator ?? "+";
  });

  const setOperator = (value: Operator) => {
    props.node.customData = { ...props.node.customData, operator: value };
    markBlueprintDirty();
  };

  return (
    <div
      style={{ padding: "2rem", height: "100%", "box-sizing": "border-box" }}
    >
      <h2 style={{ margin: "0 0 1rem 0" }}>Operation Node</h2>
      <select
        style={selectStyle}
        value={operator()}
        onChange={(event) => setOperator(event.currentTarget.value as Operator)}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
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
