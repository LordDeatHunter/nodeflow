import { Vec2 } from "solid-drawflow/src/utils/vec2";
import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  CurveFunctions,
  drawflow,
  DrawflowNode,
  getTotalConnectedInputs,
  SetCurveFunction,
} from "solid-drawflow/src";
import nodeCss from "./styles/node.module.scss";
import { drawflowEventStore } from "solid-drawflow/src/utils/events";
import curveCss from "./styles/curve.module.scss";
import NodeDisplay from "./NodeDisplay";

export const createDummyNode = (
  position: Vec2,
  center = false,
): DrawflowNode => {
  const newNode = addNode({
    css: {
      normal: nodeCss.node,
      selected: nodeCss.selectedNode,
    },
    position,
    display: NodeDisplay,
    centered: center,
  });
  addConnectorSection(newNode.id, "inputs", nodeCss.inputsSection, false);
  addConnectorSection(newNode.id, "outputs", nodeCss.outputsSection, false);

  const outputs = Math.random() * 6;
  for (let j = 0; j < outputs; j++) {
    addConnector(
      newNode.id,
      "outputs",
      undefined,
      {
        css: nodeCss.outputConnector,
      },
      false,
    );
  }
  const inputs = Math.random() * 6;
  for (let j = 0; j < inputs; j++) {
    addConnector(
      newNode.id,
      "inputs",
      undefined,
      {
        css: nodeCss.inputConnector,
      },
      false,
    );
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
    createDummyNode(Vec2.of(Math.random() * 2000, Math.random() * 2000));
  }
};

export const setupDummyConnections = () => {
  const totalNodes = drawflow.nodes.size;

  for (let i = 0; i < totalNodes; i++) {
    const from = Math.floor(Math.random() * totalNodes);
    const to = Math.floor(Math.random() * totalNodes);

    if (
      !drawflow.nodes.has(from.toString()) ||
      !drawflow.nodes.has(to.toString())
    ) {
      continue;
    }
    const fromNode = drawflow.nodes.get(from.toString())!;
    const toNode = drawflow.nodes.get(to.toString())!;

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
        selected: curveCss.selectedConnection,
      },
    );
  }
};
