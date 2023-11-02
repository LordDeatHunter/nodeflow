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
import {
  CurveFunctions,
  SetCurveFunction,
} from "solid-drawflow/src/utils/curve-functions";
import { ConnectorTypes } from "solid-drawflow/src";

for (let i = 0; i < 50; i++) {
  const newNode = addNode(Math.random() * 2000, Math.random() * 2000, {
    css: {
      normal: nodeCss.node,
      selected: nodeCss["selected-node"],
    },
  });
  addConnectorSection(newNode.nodeId, "inputs", nodeCss["inputs-section"]);
  addConnectorSection(newNode.nodeId, "outputs", nodeCss["outputs-section"]);

  const outputs = 1 + Math.random() * 3;
  for (let j = 0; j < outputs; j++) {
    addConnector(newNode.nodeId, "outputs", undefined, {
      type: ConnectorTypes.Output,
      css: nodeCss["output-connector"],
    });
  }
  const inputs = 1 + Math.random() * 3;
  for (let j = 0; j < inputs; j++) {
    addConnector(newNode.nodeId, "inputs", undefined, {
      type: ConnectorTypes.Input,
      css: nodeCss["input-connector"],
    });
  }
}
NODE_CONNECTION_SUBSCRIPTIONS["create-connection"] = (
  outputNodeId,
  outputId,
  inputNodeId,
  inputId,
) => {
  addConnection(
    outputNodeId,
    outputId,
    inputNodeId,
    inputId,
    curveCss.connection,
  );
};
SetCurveFunction("getDefaultCurve", CurveFunctions.getHorizontalCurve);

const totalNodes = Object.keys(nodes).length;

for (let i = 0; i < totalNodes; i++) {
  const from = Math.floor(Math.random() * totalNodes);
  const to = Math.floor(Math.random() * totalNodes);
  const fromNode = nodes[from.toString()];
  const toNode = nodes[to.toString()];
  if (!fromNode || !toNode) {
    continue;
  }

  const toInput = Math.floor(
    Math.random() *
      Object.keys(toNode.connectorSections["inputs"].connectors).length,
  );
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
    curveCss.connection,
  );
}

const App: Component = () => (
  <Drawflow css={{ newCurve: drawflowCss["new-curve"] }} />
);

export default App;
