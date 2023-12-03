import { Vec2 } from "solid-drawflow/src/utils/vec2";
import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  CurveFunctions,
  DrawflowNode,
  getTotalConnectedInputs,
  nodes,
  SetCurveFunction,
} from "solid-drawflow/src";
import nodeCss from "./styles/node.module.scss";
import { drawflowEventStore } from "../../src/utils/events";
import curveCss from "./styles/curve.module.scss";

export const createDummyNode = (position: Vec2): DrawflowNode => {
  const newNode = addNode(position.x, position.y, {
    css: {
      normal: nodeCss.node,
      selected: nodeCss["selected-node"],
    },
  });
  addConnectorSection(newNode.id, "inputs", nodeCss["inputs-section"]);
  addConnectorSection(newNode.id, "outputs", nodeCss["outputs-section"]);

  const outputs = 1 + Math.random() * 3;
  for (let j = 0; j < outputs; j++) {
    addConnector(newNode.id, "outputs", undefined, {
      css: nodeCss["output-connector"],
    });
  }
  const inputs = 1 + Math.random() * 3;
  for (let j = 0; j < inputs; j++) {
    addConnector(newNode.id, "inputs", undefined, {
      css: nodeCss["input-connector"],
    });
  }

  return newNode;
};

export const setupEvents = () => {
  // Override the default create-connection subscription to prevent connecting to the same node, and set custom css when creating a connection
  drawflowEventStore.onNodeConnected.subscribe("create-connection", (data) => {
    if (data.outputNodeId === data.inputNodeId) {
      return;
    }
    addConnection(
      data.outputNodeId,
      data.outputId,
      data.inputNodeId,
      data.inputId,
      {
        normal: curveCss.connection,
        selected: curveCss["selected-connection"],
      },
    );
  });
  SetCurveFunction("getDefaultCurve", CurveFunctions.getHorizontalCurve);
  SetCurveFunction(
    "createNodePathCurve",
    CurveFunctions.createDraggingPathCurve,
  );
};

export const setupDummyNodes = (count: number = 50) => {
  for (let i = 0; i < count; i++) {
    createDummyNode(new Vec2(Math.random() * 2000, Math.random() * 2000));
  }
};

export const setupDummyConnections = () => {
  const totalNodes = Object.keys(nodes).length;

  for (let i = 0; i < totalNodes; i++) {
    const from = Math.floor(Math.random() * totalNodes);
    const to = Math.floor(Math.random() * totalNodes);
    const fromNode = nodes[from.toString()];
    const toNode = nodes[to.toString()];
    if (!fromNode || !toNode) {
      continue;
    }

    const fromConnectors = fromNode.connectorSections["outputs"].connectors;
    const toConnectors = toNode.connectorSections["inputs"].connectors;

    const fromConnectorValues = Object.values(fromConnectors);
    const toConnectorValues = Object.values(toConnectors);

    const fromConnector =
      fromConnectorValues[
        Math.floor(Math.random() * fromConnectorValues.length)
      ];
    const toConnector =
      toConnectorValues[Math.floor(Math.random() * toConnectorValues.length)];

    if (
      from === to ||
      getTotalConnectedInputs(to.toString(), toConnector.toString()) > 0
    ) {
      continue;
    }

    addConnection(
      from.toString(),
      fromConnector.id,
      to.toString(),
      toConnector.id,
      {
        normal: curveCss.connection,
        selected: curveCss["selected-connection"],
      },
    );
  }
};
