import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  CurveFunctions,
  DrawflowNode,
  getTotalConnectedInputs,
  globalMousePosition,
  mouseData,
  nodes,
  removeOutgoingConnections,
  SelectableElementCSS,
  SetCurveFunction,
  updateNode,
} from "solid-drawflow/src";
import nodeCss from "./styles/node.module.scss";
import { CustomDataType } from "./types";
import { Vec2 } from "solid-drawflow/src/utils/vec2";
import { drawflowEventStore } from "solid-drawflow/src/utils/events";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./NodeBody";

export const getRandomGender = () =>
  Math.floor(Math.random() * 2) === 1 ? "M" : "F";

const getConnectionCSS = (parentGender: "M" | "F"): SelectableElementCSS => ({
  normal: parentGender == "M" ? curveCss.father : curveCss.mother,
  selected:
    parentGender == "M"
      ? curveCss["selected-father"]
      : curveCss["selected-mother"],
});

export const createFamilyMemberNode = (
  gender: CustomDataType["gender"],
  position: Vec2,
): DrawflowNode => {
  const newNode = addNode({
    css: {
      normal: nodeCss[gender === "M" ? "male-node" : "female-node"],
      selected:
        nodeCss[gender === "M" ? "selected-male-node" : "selected-female-node"],
    },
    position,
    customData: { gender, name: "John Smith" },
    display: NodeBody,
    centered: true,
  });
  addConnectorSection(newNode.id, "inputs", nodeCss["inputs-section"], false);
  addConnectorSection(newNode.id, "outputs", nodeCss["outputs-section"], false);

  addConnector(
    newNode.id,
    "outputs",
    "C",
    {
      css: nodeCss["output-connector"],
    },
    false,
  );
  addConnector(
    newNode.id,
    "inputs",
    "F",
    {
      css: nodeCss["mother-input-connector"],
    },
    false,
  );
  addConnector(
    newNode.id,
    "inputs",
    "M",
    {
      css: nodeCss["father-input-connector"],
    },
    false,
  );

  return newNode;
};

export const setupDummyNodes = (count: number = 50) => {
  for (let i = 0; i < count; i++) {
    createFamilyMemberNode(
      getRandomGender(),
      Vec2.of(Math.random() * 2000, Math.random() * 2000),
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

  drawflowEventStore.onPointerUpInDrawflow.subscribe(
    "spawn-new-node",
    () => {
      if (!mouseData.heldConnectorId) return;

      const newNode = createFamilyMemberNode(
        getRandomGender(),
        globalMousePosition(),
      );

      const parent = nodes[mouseData.heldNodeId!];
      addConnection(
        mouseData.heldNodeId!,
        mouseData.heldConnectorId,
        newNode.id,
        parent.customData.gender,
        getConnectionCSS(parent.customData.gender),
      );
    },
    1,
  );

  drawflowEventStore.onNodeDataChanged.subscribe(
    "update-node-css",
    ({ nodeId, data }) => {
      const node = nodes[nodeId];
      if (!node) return;
      if (!("customData" in data)) return;
      const customData = data.customData as CustomDataType;
      if (!("gender" in customData)) return;
      const gender = customData.gender;

      updateNode(nodeId, {
        css: {
          normal: nodeCss[gender === "M" ? "male-node" : "female-node"],
          selected:
            nodeCss[
              gender === "M" ? "selected-male-node" : "selected-female-node"
            ],
        },
      });

      // TODO: maybe create new connections to the respective connectors of the new gender? Eg. mother->father, father->mother
      removeOutgoingConnections(nodeId);
    },
  );

  // Override the default create-connection subscription to only allow one connection per input, and set custom css
  drawflowEventStore.onNodeConnected.subscribe(
    "create-connection",
    ({ outputNodeId, outputId, inputNodeId, inputId }) => {
      const outputNode = nodes[outputNodeId];

      // If the source node's gender does not match the destination connector, or if that connector already has a connection, return.
      if (
        outputNode.customData.gender !== inputId ||
        getTotalConnectedInputs(inputNodeId, inputId) > 0 ||
        outputNodeId === inputNodeId
      ) {
        return;
      }

      addConnection(
        outputNodeId,
        outputId,
        inputNodeId,
        inputId,
        getConnectionCSS(outputNode.customData.gender),
      );
    },
  );

  SetCurveFunction("getDefaultCurve", CurveFunctions.getVerticalCurve);
  SetCurveFunction(
    "createNodePathCurve",
    CurveFunctions.createDraggingPathCurve,
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

    const toInput = fromNode.customData.gender;
    if (from === to || getTotalConnectedInputs(to.toString(), toInput) > 0) {
      continue;
    }

    addConnection(
      from.toString(),
      "C",
      to.toString(),
      toInput.toString(),
      getConnectionCSS(fromNode.customData.gender),
    );
  }
};
