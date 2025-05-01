import { createSignal, Show } from "solid-js";
import { CustomNodeData, DisplayFunc, NodeflowNodeData } from "nodeflow-lib";
import { nodeflowData } from "./App";

export class DisplayNodeData extends CustomNodeData {
  public serialize(): CustomNodeflowDataType {
    return {
      type: "display",
    };
  }
}

const DisplayNode: DisplayFunc = (props: { node: NodeflowNodeData }) => {
  const [connectorData, setConnectorData] = createSignal(
    props.node.getAllSourceConnectors()[0]?.customData?.value,
  );

  nodeflowData.eventStore.onConnectionAdded.subscribe(
    `display-node-${props.node.id}`,
    ({
      sourceNodeId,
      sourceConnectorId,
      destinationNodeId,
      destinationConnectorId,
    }) => {
      console.log(
        "display-node",
        props.node.id,
        sourceNodeId,
        sourceConnectorId,
        destinationNodeId,
        destinationConnectorId,
      );

      if (
        destinationNodeId !== props.node.id ||
        destinationConnectorId !== "input-0"
      )
        return;

      const node = nodeflowData.nodes.get(sourceNodeId);
      if (!node) return;
      const connector = node.getConnector(sourceConnectorId);
      if (!connector) return;

      setConnectorData(connector.customData?.value);
    },
  );

  nodeflowData.eventStore.onConnectionRemoved.subscribe(
    `display-node-${props.node.id}`,
    ({ destinationNodeId, destinationConnectorId }) => {
      if (
        destinationNodeId !== props.node.id ||
        destinationConnectorId !== "input-0"
      )
        return;

      setConnectorData(undefined);
    },
  );

  nodeflowData.eventStore.onConnectorCustomDataChanged.subscribe(
    `display-node-${props.node.id}`,
    (data) => {
      console.log("data", props.node.id, data);
      const connector = props.node.getConnector("input-0");
      if (!connector) return;
      const source = connector.sources[0];
      if (!source) return;
      const sourceNode = source.sourceConnector.parentNode;
      if (sourceNode.id !== data.nodeId) return;
      if (source.sourceConnector.id !== data.connectorId) return;

      const updatedConnector = source.sourceConnector;

      setConnectorData(updatedConnector.customData?.value);
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
            {JSON.stringify(Number(connectorData()!.toFixed(2)))}
          </p>
        </div>
      </Show>
    </div>
  ) as HTMLDivElement;
};

export default DisplayNode;
