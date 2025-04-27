import { createSignal, Show } from "solid-js";
import {
  CustomNodeData,
  DisplayFunc,
  NodeflowNodeData,
  Optional,
} from "nodeflow-lib";
import { nodeflowData } from "./App";

export class DisplayNodeData extends CustomNodeData {
  public serialize(): CustomNodeflowDataType {
    return {
      type: "display",
    };
  }
}

const DisplayNode: DisplayFunc = (props: { node: NodeflowNodeData }) => {
  const [connectorData, setConnectorData] = createSignal<Optional<number>>();
  nodeflowData.eventStore.onConnectorCustomDataChanged.subscribe(
    `display-node-${props.node.id}`,
    (data) => {
      console.log("data", props.node.id, data);
      if (data.nodeId !== props.node.id || data.connectorId !== "input-0")
        return;
      const connector =
        props.node.getConnector("input-0")?.sources[0]?.sourceConnector;
      if (!connector) return;
      setConnectorData(connector.customData as Optional<number>);
    },
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
  ) as HTMLDivElement;
};

export default DisplayNode;
