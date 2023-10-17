import { type Component } from "solid-js";
import Drawflow from "./components/Drawflow";
import curveCss from "./styles/curve.module.scss";
import nodeCss from "./styles/blueprint-node.module.scss";
import drawflowCss from "./styles/drawflow.module.scss";
import {
  addConnection,
  addInput,
  addNode,
  addOutput,
  getTotalConnectedInputs,
  nodes,
} from "./utils/drawflow-storage";
import { NODE_CONNECTION_SUBSCRIPTIONS } from "./utils/node-functions";

for (let i = 0; i < 50; i++) {
  const newNode = addNode(Math.random() * 2000, Math.random() * 2000, {
    css: {
      inputsSection: nodeCss["inputs-section"],
      normal: nodeCss.node,
      outputsSection: nodeCss["outputs-section"],
      selected: nodeCss["selected-node"],
    },
  });
  const outputs = 1 + Math.random() * 3;
  for (let j = 0; j < outputs; j++) {
    addOutput(newNode.nodeId, undefined, nodeCss["output-connector"]);
  }
  const inputs = 1 + Math.random() * 3;
  for (let j = 0; j < inputs; j++) {
    addInput(newNode.nodeId, undefined, nodeCss["input-connector"]);
  }
}
NODE_CONNECTION_SUBSCRIPTIONS["create-connection"] = (
  outputNodeId,
  outputId,
  inputNodeId,
  inputId,
) => {
  addConnection(outputNodeId, outputId, inputNodeId, inputId, curveCss.father);
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

  const toInput = Math.floor(Math.random() * Object.keys(toNode.inputs).length);
  if (
    from === to ||
    getTotalConnectedInputs(to.toString(), toInput.toString()) > 0
  ) {
    continue;
  }

  addConnection(
    from.toString(),
    "0",
    to.toString(),
    toInput.toString(),
    curveCss.father,
  );
}

const BlueprintApp: Component = () => (
  <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
);

export default BlueprintApp;
