import { Component, createMemo } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { blueprintRevision, markBlueprintDirty } from "./reactivity";
import { Operator } from "./values";
import contentCss from "./styles/content.module.scss";

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
    <div class={contentCss.pad}>
      <span class={contentCss.label}>Operation</span>
      <select
        class={contentCss.control}
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
