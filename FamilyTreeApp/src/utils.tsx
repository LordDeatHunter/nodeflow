import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  DrawflowNode,
  getTotalConnectedInputs,
  nodes,
} from "solid-drawflow/src";
import nodeCss from "./styles/node.module.scss";
import { CustomDataType } from "./types";
import { Vec2 } from "solid-drawflow/src/utils/vec2";
import { drawflowEventStore } from "solid-drawflow/src/utils/events";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./NodeBody";

export const getRandomGender = () =>
  Math.floor(Math.random() * 2) === 1 ? "M" : "F";

export const createFamilyMemberNode = (
  gender: CustomDataType["gender"],
  position: Vec2,
): DrawflowNode => {
  const newNode = addNode(position.x, position.y, {
    css: {
      normal: nodeCss[gender === "M" ? "male-node" : "female-node"],
      selected:
        nodeCss[gender === "M" ? "selected-male-node" : "selected-female-node"],
    },
    customData: { gender },
    display: NodeBody,
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

  return newNode;
};

export const setupDummyNodes = (count: number = 50) => {
  for (let i = 0; i < count; i++) {
    createFamilyMemberNode(
      getRandomGender(),
      new Vec2(Math.random() * 2000, Math.random() * 2000),
    );
  }
};

export const setupEvents = () => {
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
};
