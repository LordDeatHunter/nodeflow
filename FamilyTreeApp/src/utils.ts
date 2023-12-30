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
import { Vec2 } from "solid-drawflow/src/utils/vec2";
import { drawflowEventStore } from "solid-drawflow/src/utils/events";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./components/NodeBody";

export const fetchRandomData = async (
  amount: number,
): Promise<
  Array<{
    name: string;
    gender: SolidDrawflow.CustomDataType["gender"];
  }>
> => {
  const response = await fetch(
    `https://randomuser.me/api/?inc=gender,name&noinfo&results=${amount}`,
  );
  return await response
    .json()
    .then(
      (data: {
        results: Array<{
          gender: "female" | "male";
          name: { title: string; first: string; last: string };
        }>;
      }) => data.results,
    )
    .then((data) =>
      data.map((person) => ({
        gender: person.gender === "female" ? "F" : "M",
        name: person.name.first + " " + person.name.last,
      })),
    );
};

const getConnectionCSS = (
  parentGender: SolidDrawflow.CustomDataType["gender"],
): SelectableElementCSS => ({
  normal: parentGender == "M" ? curveCss.father : curveCss.mother,
  selected:
    parentGender == "M"
      ? curveCss["selected-father"]
      : curveCss["selected-mother"],
});

export const createFamilyMemberNode = (
  name: string,
  gender: SolidDrawflow.CustomDataType["gender"],
  position?: Vec2,
): DrawflowNode => {
  const newNode = addNode({
    css: {
      normal: nodeCss[gender === "M" ? "male-node" : "female-node"],
      selected:
        nodeCss[gender === "M" ? "selected-male-node" : "selected-female-node"],
    },
    position,
    customData: { gender, name },
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

export const setupDummyNodes = async (count: number = 50) => {
  const data = await fetchRandomData(count);
  for (const person of data) {
    createFamilyMemberNode(
      person.name,
      person.gender,
      Vec2.of((Math.random() * 2 - 1) * 2000, (Math.random() * 2 - 1) * 2000),
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
      const heldNodeId = mouseData.heldNodeId;
      const heldConnectorId = mouseData.heldConnectorId;

      if (!heldNodeId || !heldConnectorId) return;

      fetchRandomData(1).then((data) => {
        const newNode = createFamilyMemberNode(
          data[0].name,
          data[0].gender,
          globalMousePosition(),
        );

        const parent = nodes[heldNodeId!];
        addConnection(
          heldNodeId!,
          heldConnectorId,
          newNode.id,
          parent.customData.gender,
          getConnectionCSS(parent.customData.gender),
        );
      });
    },
    1,
  );

  drawflowEventStore.onNodeDataChanged.subscribe(
    "update-node-css",
    ({ nodeId, data }) => {
      const node = nodes[nodeId];
      if (!node || !("customData" in data)) return;
      const customData = data.customData as SolidDrawflow.CustomDataType;

      if (!("gender" in customData)) return;
      const gender = customData.gender;

      if (gender === node.customData.gender) return;

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
