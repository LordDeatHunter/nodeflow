import { Component, createMemo, Show } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import { formatValue, getNodeValue } from "./values";

const DisplayNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const value = createMemo(() => getNodeValue(props.node));

  return (
    <div style={{ padding: "2rem 1rem", "pointer-events": "none" }}>
      <Show when={value() !== undefined} fallback={<h2>No Node Data</h2>}>
        <div>
          <h2>Node value</h2>
          <p style={{ "font-size": "2rem", "margin-top": "1rem" }}>
            {formatValue(value()!)}
          </p>
        </div>
      </Show>
    </div>
  );
};

export default DisplayNode;
