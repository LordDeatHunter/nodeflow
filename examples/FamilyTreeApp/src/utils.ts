import { NodeflowNodeData, SelectableElementCSS, Vec2 } from "nodeflow-lib";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./components/NodeBody";
import { nodeflowData } from "./App";
import FamilyMember from "../FamilyMember";

export const fetchRandomData = async (
  amount: number,
): Promise<
  Array<{
    name: string;
    gender: CustomNodeflowDataType["gender"];
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
  parentGender: CustomNodeflowDataType["gender"],
): SelectableElementCSS => ({
  normal: parentGender == "M" ? curveCss.fatherCurve : curveCss.motherCurve,
  selected:
    parentGender == "M"
      ? curveCss.selectedFatherCurve
      : curveCss.selectedMotherCurve,
});

export const createFamilyMemberNode = (
  name: string,
  gender: CustomNodeflowDataType["gender"],
  position?: Vec2,
): NodeflowNodeData => {
  const historyGroup = name;

  const newNode = nodeflowData.addNode(
    {
      css: {
        normal: gender === "M" ? nodeCss.maleNode : nodeCss.femaleNode,
        selected:
          gender === "M"
            ? nodeCss.selectedMaleNode
            : nodeCss.selectedFemaleNode,
      },
      position,
      customData: { gender, name },
      display: NodeBody,
      centered: true,
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

  outputSection.addConnector(
    {
      id: "O",
      css:
        gender === "M"
          ? nodeCss.maleOutputConnector
          : nodeCss.femaleOutputConnector,
    },
    historyGroup,
  );
  inputSection.addConnector(
    {
      id: "I",
      css: nodeCss.inputConnector,
    },
    historyGroup,
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
  nodeflowData.eventStore.onPointerUpInConnector.blacklist(
    "familytree-app:prevent-connections-to-parent-connectors",
    ({ connectorId }, name) =>
      connectorId === "O" && name === "nodeflow:connect-held-nodes",
  );
  nodeflowData.eventStore.onTouchStartInConnector.blacklist(
    "familytree-app:prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
  );
  nodeflowData.eventStore.onMouseDownInConnector.blacklist(
    "familytree-app:prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
  );
  nodeflowData.eventStore.onPointerUpInNodeflow.subscribe(
    "familytree-app:spawn-new-node",
    () => {
      const heldConnectors = nodeflowData.mouseData.heldConnectors;

      if (heldConnectors.length !== 1) return;

      const heldNode = heldConnectors[0].parentNode;

      const position = nodeflowData.mouseData.globalMousePosition();

      fetchRandomData(1).then((data) => {
        const newNode = createFamilyMemberNode(
          data[0].name,
          data[0].gender,
          position,
        );

        nodeflowData.addConnection({
          sourceNodeId: heldNode.id,
          sourceConnectorId: "O",
          destinationNodeId: newNode.id,
          destinationConnectorId: "I",
          css: getConnectionCSS((heldNode.customData as FamilyMember).gender),
        });
      });
    },
    1,
  );

  // Override the default create-connection subscription to only allow one connection per input, and set custom css
  nodeflowData.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId }) => {
      if (outputNodeId === inputNodeId) return;

      const outputNode = nodeflowData.nodes.get(outputNodeId)!;
      const inputNode = nodeflowData.nodes.get(inputNodeId)!;

      const connector = inputNode.getConnector("I")?.sources;

      // Return if:
      // The connector already has 2 parents
      // The connector already has parent of the same gender as the source node
      if (
        connector?.length === 2 ||
        connector?.some(
          (source) =>
            (source.sourceConnector.parentNode.customData as FamilyMember)
              .gender === (outputNode.customData as FamilyMember).gender,
        )
      ) {
        return;
      }

      nodeflowData.addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: "O",
        destinationNodeId: inputNodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS((outputNode.customData as FamilyMember).gender),
      });
    },
  );

  nodeflowData.eventStore.onPointerUpInNode.subscribe(
    "nodeflow:create-connection",
    ({ nodeId }) => {
      const destinationNode = nodeflowData.nodes.get(nodeId);

      if (
        !destinationNode ||
        nodeflowData.mouseData.heldConnectors.length !== 1
      )
        return;

      const sourceNode =
        nodeflowData.mouseData.heldConnectors[0].parentSection.parentNode;

      if (nodeId === sourceNode.id) return;

      const connector = destinationNode.getConnector("I")?.sources;
      // Return if:
      // The connector already has 2 parents
      // One of the parents is the same gender as the source node
      if (
        connector?.length === 2 ||
        connector?.some(
          (source) =>
            (source.sourceConnector.parentNode.customData as FamilyMember)
              .gender === (sourceNode.customData as FamilyMember).gender,
        )
      )
        return;

      nodeflowData.addConnection({
        sourceNodeId: sourceNode.id,
        sourceConnectorId: "O",
        destinationNodeId: nodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS((sourceNode.customData as FamilyMember).gender),
      });
    },
    2,
  );
};

export const setupDummyConnections = () => {
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

    const sourceGender = (fromNode.customData as FamilyMember).gender;

    const connector = toNode.getConnector("I")?.sources;
    // Continue if:
    // The source node is the same as the destination node
    // The destination node already has a connection
    if (
      from === to ||
      connector?.length === 2 ||
      connector?.some(
        (source) =>
          (source.sourceConnector.parentNode.customData as FamilyMember)
            .gender === sourceGender,
      )
    ) {
      continue;
    }

    nodeflowData.addConnection({
      sourceNodeId: from.toString(),
      sourceConnectorId: "O",
      destinationNodeId: to.toString(),
      destinationConnectorId: "I",
      css: getConnectionCSS((fromNode.customData as FamilyMember).gender),
    });
  }
};

export const cleanInput = (input?: string): string =>
  !input ? "" : input.trim().replace(/\s+/g, " ");
