import { Component, createMemo, Show } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { formatValue, getNodeValue } from "./values";
import contentCss from "./styles/content.module.scss";

const DisplayNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const value = createMemo(() => getNodeValue(props.node));

  return (
    <div class={contentCss.displayRoot}>
      <Show
        when={value() !== undefined}
        fallback={<p class={contentCss.emptyValue}>No node data</p>}
      >
        <span class={contentCss.label}>Node value</span>
        <p class={contentCss.displayValue}>{formatValue(value()!)}</p>
      </Show>
    </div>
  );
};

export default DisplayNode;
