import { type Component } from "solid-js";
import Drawflow from "solid-drawflow/src/components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  getTotalConnectedInputs,
  nodes,
} from "solid-drawflow/src/utils/drawflow-storage";
import { drawflowEventStore } from "solid-drawflow/src/utils/events";

for (let i = 0; i < 50; i++) {
  const gender = Math.floor(Math.random() * 2) === 1 ? "M" : "F";
  const newNode = addNode(Math.random() * 2000, Math.random() * 2000, {
    css: {
      normal: nodeCss[gender === "M" ? "male-node" : "female-node"],
      selected:
        nodeCss[gender === "M" ? "selected-male-node" : "selected-female-node"],
    },
    customData: { gender },
    display: (nodeId: string) => <h1>Node {nodeId}</h1>,
  });
  addConnectorSection(newNode.id, "inputs", nodeCss["inputs-section"]);
  addConnectorSection(newNode.id, "outputs", nodeCss["outputs-section"]);

  addConnector(newNode.id, "outputs", "C", {
    css: nodeCss["output-connector"],
  });
  addConnector(newNode.id, "inputs", "F", {
    css: nodeCss["mother-input-connector"],
  });
  addConnector(newNode.id, "inputs", "M", {
    css: nodeCss["father-input-connector"],
  });
}

drawflowEventStore.onPointerUpInConnector.blacklist(
  "prevent-connections-to-parent-connectors",
  ({ connectorId }) => connectorId === "C",
);
drawflowEventStore.onTouchStartInConnector.blacklist(
  "prevent-connections-from-parent-connectors",
  ({ connectorId }) => connectorId === "F" || connectorId === "M",
);
drawflowEventStore.onMouseDownInConnector.blacklist(
  "prevent-connections-from-parent-connectors",
  ({ connectorId }) => connectorId === "F" || connectorId === "M",
);

// Override the default create-connection subscription to only allow one connection per input, and set custom css
drawflowEventStore.onNodeConnected.subscribe(
  "create-connection",
  ({ outputNodeId, outputId, inputNodeId, inputId }) => {
    const outputNode = nodes[outputNodeId];

    // If the source node's gender does not match the destination connector, or if that connector already has a connection, return.
    if (
      outputNode.customData!.gender !== inputId ||
      getTotalConnectedInputs(inputNodeId, inputId) > 0
    ) {
      return;
    }

    addConnection(
      outputNodeId,
      outputId,
      inputNodeId,
      inputId,
      inputId == "M" ? curveCss.father : curveCss.mother,
    );
  },
);

const totalNodes = Object.keys(nodes).length;

for (let i = 0; i < totalNodes; i++) {
  const from = Math.floor(Math.random() * totalNodes);
  const to = Math.floor(Math.random() * totalNodes);
  const fromNode = nodes[from.toString()];
  const toNode = nodes[to.toString()];
  if (!fromNode || !toNode) {
    continue;
  }

  const toInput = fromNode.customData!.gender;
  if (from === to || getTotalConnectedInputs(to.toString(), toInput) > 0) {
    continue;
  }

  addConnection(
    from.toString(),
    "C",
    to.toString(),
    toInput.toString(),
    toInput == "M" ? curveCss.father : curveCss.mother,
  );
}

const App: Component = () => (
  <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
);

export default App;
