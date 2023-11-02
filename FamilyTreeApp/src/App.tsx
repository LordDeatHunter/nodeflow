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
import { NODE_CONNECTION_SUBSCRIPTIONS } from "solid-drawflow/src/utils/node-functions";
import { ConnectorTypes } from "solid-drawflow/src";

for (let i = 0; i < 50; i++) {
  const newNode = addNode(Math.random() * 2000, Math.random() * 2000, {
    css: {
      normal: nodeCss.node,
      selected: nodeCss["selected-node"],
    },
    customData: {
      gender: Math.floor(Math.random() * 2) === 1 ? "M" : "F",
    },
    display: (nodeId: string) => <h1>Node {nodeId}</h1>,
  });
  addConnectorSection(newNode.nodeId, "inputs", nodeCss["inputs-section"]);
  addConnectorSection(newNode.nodeId, "outputs", nodeCss["outputs-section"]);

  addConnector(newNode.nodeId, "outputs", undefined, {
    type: ConnectorTypes.Output,
    css: nodeCss["output-connector"],
  });
  addConnector(newNode.nodeId, "inputs", "F", {
    type: ConnectorTypes.Input,
    css: nodeCss["mother-input-connector"],
  });
  addConnector(newNode.nodeId, "inputs", "M", {
    type: ConnectorTypes.Input,
    css: nodeCss["father-input-connector"],
  });
}
NODE_CONNECTION_SUBSCRIPTIONS["create-connection"] = (
  outputNodeId,
  outputId,
  inputNodeId,
  inputId,
) => {
  const outputNode = nodes[outputNodeId];

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
};

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
    "0",
    to.toString(),
    toInput.toString(),
    toInput == "M" ? curveCss.father : curveCss.mother,
  );
}

const App: Component = () => (
  <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
);

export default App;
