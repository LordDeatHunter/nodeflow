import { DisplayFunc, NodeflowNodeData, Vec2 } from "nodeflow-lib";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import { nodeflowData } from "./App";

export const createNewNode = (
  position: Vec2,
  centered = false,
  display: DisplayFunc,
  inputs: number,
  outputs: number,
): NodeflowNodeData => {
  const historyGroup = crypto.randomUUID();

  const newNode = nodeflowData.addNode(
    {
      css: {
        normal: nodeCss.node,
        selected: nodeCss.selectedNode,
      },
      position,
      display,
      centered,
    },
    historyGroup,
  );

  const inputSection = newNode.addConnectorSection(
    {
      id: "inputs",
      css: nodeCss.inputsSection,
    },
    historyGroup,
  );

  const outputSection = newNode.addConnectorSection(
    {
      id: "outputs",
      css: nodeCss.outputsSection,
    },
    historyGroup,
  );

  for (let i = 0; i < outputs; i++) {
    outputSection.addConnector(
      {
        id: `output-${i}`,
        css: nodeCss.outputConnector,
        customData: {
          // TODO: unhardcode the type
          type: "number",
          value: 0,
        },
      },
      historyGroup,
    );
  }

  for (let i = 0; i < inputs; i++) {
    inputSection.addConnector(
      {
        id: `input-${i}`,
        css: nodeCss.inputConnector,
        customData: {
          type: "number",
        },
      },
      historyGroup,
    );
  }

  return newNode;
};

export const setupEvents = () => {
  // Override the default create-connection subscription to prevent connecting to the same node, and set custom css when creating a connection
  nodeflowData.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId, outputId, inputId }) => {
      if (outputNodeId === inputNodeId) {
        return;
      }

      const inputNode = nodeflowData.nodes.get(inputNodeId)!;
      const outputNode = nodeflowData.nodes.get(outputNodeId)!;

      const inputs = inputNode.connectorSections.get("inputs")!.connectors;
      const outputs = outputNode.connectorSections.get("outputs")!.connectors;

      if (!inputs.has(inputId) || !outputs.has(outputId)) {
        return;
      }

      const inputConnector = inputs.get(inputId)!;

      if (inputConnector.sources.length > 0) {
        return;
      }

      nodeflowData.addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: outputId,
        destinationNodeId: inputNodeId,
        destinationConnectorId: inputId,
        css: {
          normal: curveCss.connection,
          selected: curveCss.selectedConnection,
        },
      });
    },
  );
};
