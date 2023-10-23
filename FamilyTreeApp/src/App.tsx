import { type Component } from "solid-js";
import Drawflow from "solid-drawflow/src/components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/node.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import {
  addConnection,
  addInput,
  addNode,
  addOutput,
  getTotalConnectedInputs,
  nodes,
} from "solid-drawflow/src/utils/drawflow-storage";
import { NODE_CONNECTION_SUBSCRIPTIONS } from "solid-drawflow/src/utils/node-functions";

for (let i = 0; i < 50; i++) {
  const newNode = addNode(Math.random() * 2000, Math.random() * 2000, {
    display: (nodeId: string) => <h1>Node {nodeId}</h1>,
    css: {
      inputsSection: nodeCss["inputs-section"],
      normal: nodeCss.node,
      outputsSection: nodeCss["outputs-section"],
      selected: nodeCss["selected-node"],
    },
    customData: {
      gender: Math.floor(Math.random() * 2) === 1 ? "M" : "F",
    },
  });
  addOutput(newNode.nodeId, undefined, nodeCss["output-connector"]);
  addInput(newNode.nodeId, undefined, nodeCss["mother-input-connector"]);
  addInput(newNode.nodeId, undefined, nodeCss["father-input-connector"]);
}
NODE_CONNECTION_SUBSCRIPTIONS["create-connection"] = (
  outputNodeId,
  outputId,
  inputNodeId,
  inputId,
) => {
  const outputNode = nodes[outputNodeId];

  if (
    (outputNode.customData.gender === "M" && inputId === "0") ||
    (outputNode.customData.gender === "F" && inputId === "1")
  ) {
    return;
  }

  addConnection(
    outputNodeId,
    outputId,
    inputNodeId,
    inputId,
    inputId == "1" ? curveCss.father : curveCss.mother,
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

  const toInput = fromNode.customData.gender === "M" ? "1" : "0";
  if (from === to || getTotalConnectedInputs(to.toString(), toInput) > 0) {
    continue;
  }

  addConnection(
    from.toString(),
    "0",
    to.toString(),
    toInput.toString(),
    toInput == "1" ? curveCss.father : curveCss.mother,
  );
}

const App: Component = () => (
  <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
);

export default App;
