import { Component, createMemo, Show } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { formatValue, getOutputValue } from "./values";
import contentCss from "./styles/content.module.scss";

/** One input, one output: flips the sign of its input. */
const NegationNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const value = createMemo(() => getOutputValue(props.node, "output-0"));

  return (
    <div class={contentCss.displayRoot}>
      <span class={contentCss.label}>Negation · −x</span>
      <Show
        when={value() !== undefined}
        fallback={<p class={contentCss.emptyValue}>No input</p>}
      >
        <p class={contentCss.displayValue}>{formatValue(value()!)}</p>
      </Show>
    </div>
  );
};

export default NegationNode;
