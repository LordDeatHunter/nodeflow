import {
  CurveFunctions,
  NodeflowData,
  NodeflowNodeData,
  SetCurveFunction,
  Vec2,
} from "nodeflow-lib";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import NodeDisplay from "./NodeDisplay";

export const createDummyNode = (
  nodeflowData: NodeflowData,
  position: Vec2,
  center = false,
): NodeflowNodeData => {
  const newNode = nodeflowData.addNode({
    css: {
      normal: nodeCss.node,
      selected: nodeCss.selectedNode,
    },
    position,
    display: NodeDisplay,
    centered: center,
  });
  newNode.addConnectorSection("inputs", nodeCss.inputsSection, false);
  newNode.addConnectorSection("outputs", nodeCss.outputsSection, false);

  const outputs = Math.random() * 6;
  for (let j = 0; j < outputs; j++) {
    newNode.addConnector(
      "outputs",
      {
        css: nodeCss.outputConnector,
      },
      false,
    );
  }
  const inputs = Math.random() * 6;
  for (let j = 0; j < inputs; j++) {
    newNode.addConnector(
      "inputs",
      {
        css: nodeCss.inputConnector,
      },
      false,
    );
  }

  return newNode;
};

export const setupEvents = (nodeflowData: NodeflowData) => {
  // Override the default create-connection subscription to prevent connecting to the same node, and set custom css when creating a connection
  nodeflowData.eventStore.onNodeConnected.subscribe(
    "create-connection",
    (data) => {
      if (data.outputNodeId === data.inputNodeId) {
        return;
      }
      nodeflowData.addConnection({
        sourceNodeId: data.outputNodeId,
        sourceConnectorId: data.outputId,
        destinationNodeId: data.inputNodeId,
        destinationConnectorId: data.inputId,
        css: {
          normal: curveCss.connection,
          selected: curveCss.selectedConnection,
        },
      });
    },
  );
  SetCurveFunction("getDefaultCurve", CurveFunctions.getHorizontalCurve);
  SetCurveFunction(
    "createNodePathCurve",
    CurveFunctions.createDraggingPathCurve,
  );
};

export const setupDummyNodes = (
  nodeflowData: NodeflowData,
  count: number = 50,
) => {
  for (let i = 0; i < count; i++) {
    createDummyNode(
      nodeflowData,
      Vec2.of(Math.random() * 2000, Math.random() * 2000),
    );
  }
};

export const setupDummyConnections = (nodeflowData: NodeflowData) => {
  const totalNodes = nodeflowData.nodes.size;

  for (let i = 0; i < totalNodes; i++) {
    const from = Math.floor(Math.random() * totalNodes);
    const to = Math.floor(Math.random() * totalNodes);

    if (
      !nodeflowData.nodes.has(from.toString()) ||
      !nodeflowData.nodes.has(to.toString())
    ) {
      continue;
    }
    const fromNode = nodeflowData.nodes.get(from.toString())!;
    const toNode = nodeflowData.nodes.get(to.toString())!;

    const fromConnectors =
      fromNode.connectorSections.get("outputs")!.connectors;
    const toConnectors = toNode.connectorSections.get("inputs")!.connectors;

    const fromConnectorValues = Array.from(fromConnectors.values());
    const toConnectorValues = Array.from(toConnectors.values());

    if (fromConnectorValues.length === 0 || toConnectorValues.length === 0) {
      continue;
    }

    const fromConnector =
      fromConnectorValues[
        Math.floor(Math.random() * fromConnectorValues.length)
      ];
    const toConnector =
      toConnectorValues[Math.floor(Math.random() * toConnectorValues.length)];

    if (
      from === to ||
      toNode.getTotalConnectedInputs(toConnector.toString()) > 0
    ) {
      continue;
    }

    nodeflowData.addConnection({
      sourceNodeId: from.toString(),
      sourceConnectorId: fromConnector.id,
      destinationNodeId: to.toString(),
      destinationConnectorId: toConnector.id,
      css: {
        normal: curveCss.connection,
        selected: curveCss.selectedConnection,
      },
    });
  }
};
