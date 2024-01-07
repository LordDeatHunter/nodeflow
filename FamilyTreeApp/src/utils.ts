import {
  addConnection,
  addConnector,
  addConnectorSection,
  addNode,
  CurveFunctions,
  DrawflowNode,
  getConnector,
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
  addConnectorSection(newNode.id, "inputs", nodeCss.inputsSection, false);
  addConnectorSection(newNode.id, "outputs", nodeCss.outputsSection, false);

  addConnector(
    newNode.id,
    "outputs",
    "O",
    {
      css:
        gender === "M"
          ? nodeCss.maleOutputConnector
          : nodeCss.femaleOutputConnector,
    },
    false,
  );
  addConnector(
    newNode.id,
    "inputs",
    "I",
    {
      css: nodeCss.inputConnector,
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
    ({ connectorId }) => connectorId === "O",
  );
  drawflowEventStore.onTouchStartInConnector.blacklist(
    "prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
  );
  drawflowEventStore.onMouseDownInConnector.blacklist(
    "prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
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
          "O",
          newNode.id,
          "I",
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
    ({ outputNodeId, inputNodeId }) => {
      const outputNode = nodes[outputNodeId];

      const connector = getConnector(inputNodeId, "I")?.sources;

      // Return if:
      // The connector already has 2 parents
      // The connector already has parent of the same gender as the source node
      // The source node is the same as the destination node (same person)
      if (
        connector?.length === 2 ||
        connector?.some(
          (source) =>
            source.sourceConnector.parentSection.parentNode.customData
              .gender === outputNode.customData.gender,
        ) ||
        outputNodeId === inputNodeId
      ) {
        return;
      }

      addConnection(
        outputNodeId,
        "O",
        inputNodeId,
        "I",
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

    const sourceGender = fromNode.customData.gender;

    const connector = getConnector(to.toString(), "I")?.sources;
    // Continue if:
    // The source node is the same as the destination node
    // The destination node already has a connection
    if (
      from === to ||
      connector?.length === 2 ||
      connector?.some(
        (source) =>
          source.sourceConnector.parentSection.parentNode.customData.gender ===
          sourceGender,
      )
    ) {
      continue;
    }

    addConnection(
      from.toString(),
      "O",
      to.toString(),
      "I",
      getConnectionCSS(fromNode.customData.gender),
    );
  }
};
