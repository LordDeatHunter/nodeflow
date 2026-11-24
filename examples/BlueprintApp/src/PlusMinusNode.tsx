import { Component, createMemo, Show } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { formatValue, getOutputValue } from "./values";
import contentCss from "./styles/content.module.scss";

/** One input, two outputs: the positive (top) and negative (bottom) value. */
const PlusMinusNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const positive = createMemo(() => getOutputValue(props.node, "output-0"));
  const negative = createMemo(() => getOutputValue(props.node, "output-1"));

  return (
    <div class={contentCss.displayRoot}>
      <span class={contentCss.label}>Plus-minus · ±x</span>
      <Show
        when={positive() !== undefined && negative() !== undefined}
        fallback={<p class={contentCss.emptyValue}>No input</p>}
      >
        <div class={contentCss.plusMinusValues}>
          <span>+{formatValue(positive()!)}</span>
          <span>{formatValue(negative()!)}</span>
        </div>
      </Show>
    </div>
  );
};

export default PlusMinusNode;
