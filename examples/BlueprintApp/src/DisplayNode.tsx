import { Component, createMemo, Show } from "solid-js";
import { CustomNodeData, NodeflowNodeData, Optional } from "nodeflow-lib";
import NumberConnector from "./data/NumberConnector";

export class DisplayNodeData extends CustomNodeData {
  public serialize(): CustomNodeflowDataType {
    return {
      type: "display",
    };
  }
}

const DisplayNode: Component<{ node: NodeflowNodeData }> = (props) => {
  const connectorData = createMemo(
    () =>
      props.node.getConnector("input-0")?.sources.get(0)?.sourceConnector
        .customData as Optional<NumberConnector>,
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
          <h2>Node value</h2>
          <p style={{ "font-size": "2rem", "margin-top": "1rem" }}>
            {JSON.stringify(Number(connectorData()!.value!.toFixed(2)))}
          </p>
        </div>
      </Show>
    </div>
  );
};

export default DisplayNode;
