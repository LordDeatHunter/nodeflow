import { Component, createMemo, Show } from "solid-js";
import { NodeflowNodeData, Optional } from "nodeflow-lib";
import OutputData from "./OutputData";

const DisplayNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const connectorData = createMemo(
    () =>
      props.node.getConnector("input-0")?.sources.get(0)?.sourceConnector
        .customData as Optional<OutputData<unknown>>,
  );

  return (
    <div
      style={{
        padding: "2rem 1rem",
        "pointer-events": "none",
      }}
    >
      <Show when={connectorData()} fallback={<h2>No Node Data</h2>}>
        <div>
          <h2>Node Data</h2>
          <p>Node Type: {JSON.stringify(connectorData()!.value)}</p>
        </div>
      </Show>
    </div>
  );
};

export default DisplayNode;
