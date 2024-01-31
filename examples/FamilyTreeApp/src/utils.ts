import {
  NodeflowData,
  NodeflowNodeData,
  SelectableElementCSS,
  Vec2,
} from "nodeflow-lib";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./components/NodeBody";

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
  nodeflowData: NodeflowData,
  name: string,
  gender: CustomNodeflowDataType["gender"],
  position?: Vec2,
): NodeflowNodeData => {
  const newNode = nodeflowData.addNode({
    css: {
      normal: gender === "M" ? nodeCss.maleNode : nodeCss.femaleNode,
      selected:
        gender === "M" ? nodeCss.selectedMaleNode : nodeCss.selectedFemaleNode,
    },
    position,
    customData: { gender, name },
    display: NodeBody,
    centered: true,
  });
  const inputSection = newNode.addConnectorSection(
    "inputs",
    nodeCss.inputsSection,
    false,
  );
  const outputSection = newNode.addConnectorSection(
    "outputs",
    nodeCss.outputsSection,
    false,
  );

  outputSection.addConnector(
    {
      id: "O",
      css:
        gender === "M"
          ? nodeCss.maleOutputConnector
          : nodeCss.femaleOutputConnector,
    },
    false,
  );
  inputSection.addConnector(
    {
      id: "I",
      css: nodeCss.inputConnector,
    },
    false,
  );

  return newNode;
};

export const setupDummyNodes = async (
  nodeflowData: NodeflowData,
  count: number = 50,
) => {
  const data = await fetchRandomData(count);
  for (const person of data) {
    createFamilyMemberNode(
      nodeflowData,
      person.name,
      person.gender,
      Vec2.of((Math.random() * 2 - 1) * 2000, (Math.random() * 2 - 1) * 2000),
    );
  }
};

export const setupEvents = (nodeflowData: NodeflowData) => {
  nodeflowData.eventStore.onPointerUpInConnector.blacklist(
    "prevent-connections-to-parent-connectors",
    ({ connectorId }, name) =>
      connectorId === "O" && name === "connect-held-nodes",
  );
  nodeflowData.eventStore.onTouchStartInConnector.blacklist(
    "prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
  );
  nodeflowData.eventStore.onMouseDownInConnector.blacklist(
    "prevent-connections-from-parent-connectors",
    ({ connectorId }) => connectorId === "I",
  );

  nodeflowData.eventStore.onPointerUpInNodeflow.subscribe(
    "spawn-new-node",
    () => {
      const heldNodeId = nodeflowData.mouseData.heldNodeId;
      const heldConnectorId = nodeflowData.mouseData.heldConnectorId;

      if (!heldNodeId || !heldConnectorId) return;

      const position = nodeflowData.mouseData.globalMousePosition();

      fetchRandomData(1).then((data) => {
        const newNode = createFamilyMemberNode(
          nodeflowData,
          data[0].name,
          data[0].gender,
          position,
        );

        const parent = nodeflowData.nodes.get(heldNodeId)!;
        nodeflowData.addConnection({
          sourceNodeId: heldNodeId,
          sourceConnectorId: "O",
          destinationNodeId: newNode.id,
          destinationConnectorId: "I",
          css: getConnectionCSS(parent.customData.gender),
        });
      });
    },
    1,
  );

  nodeflowData.eventStore.onNodeDataChanged.subscribe(
    "update-node-css",
    ({ nodeId, data }) => {
      if (!nodeflowData.nodes.has(nodeId) || !("customData" in data)) return;

      const node = nodeflowData.nodes.get(nodeId)!;
      const customData = data.customData as CustomNodeflowDataType;

      if (!("gender" in customData)) return;
      const gender = customData.gender;

      if (gender === node.customData.gender) return;

      nodeflowData.updateNode(nodeId, {
        css: {
          normal: gender === "M" ? nodeCss.maleNode : nodeCss.femaleNode,
          selected:
            gender === "M"
              ? nodeCss.selectedMaleNode
              : nodeCss.selectedFemaleNode,
        },
      });

      // TODO: maybe create new connections to the respective connectors of the new gender? Eg. mother->father, father->mother
      nodeflowData.removeOutgoingConnections(nodeId);
    },
  );

  // Override the default create-connection subscription to only allow one connection per input, and set custom css
  nodeflowData.eventStore.onNodeConnected.subscribe(
    "create-connection",
    ({ outputNodeId, inputNodeId }) => {
      const outputNode = nodeflowData.nodes.get(outputNodeId)!;
      const inputNode = nodeflowData.nodes.get(inputNodeId)!;

      if (outputNodeId === inputNodeId) return;

      const connector = inputNode.getConnector("I")?.sources;

      // Return if:
      // The connector already has 2 parents
      // The connector already has parent of the same gender as the source node
      if (
        connector?.length === 2 ||
        connector?.some(
          (source) =>
            source.sourceConnector.parentSection.parentNode.customData
              .gender === outputNode.customData.gender,
        )
      ) {
        return;
      }

      nodeflowData.addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: "O",
        destinationNodeId: inputNodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS(outputNode.customData.gender),
      });
    },
  );

  nodeflowData.eventStore.onPointerUpInNode.subscribe(
    "create-connection",
    ({ nodeId }) => {
      const destinationNode = nodeflowData.nodes.get(nodeId);
      const sourceId = nodeflowData.mouseData.heldNodeId;
      if (!destinationNode || !sourceId || nodeId === sourceId) {
        return;
      }

      if (!nodeflowData.nodes.has(sourceId)) return;
      const sourceNode = nodeflowData.nodes.get(sourceId)!;

      const connector = destinationNode.getConnector("I")?.sources;
      // Return if:
      // The connector already has 2 parents
      // One of the parents is the same gender as the source node
      if (
        connector?.length === 2 ||
        connector?.some(
          (source) =>
            source.sourceConnector.parentSection.parentNode.customData
              .gender === sourceNode.customData.gender,
        )
      )
        return;

      nodeflowData.addConnection({
        sourceNodeId: sourceId,
        sourceConnectorId: "O",
        destinationNodeId: nodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS(sourceNode.customData.gender),
      });
    },
  );
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

    const sourceGender = fromNode.customData.gender;

    const connector = toNode.getConnector("I")?.sources;
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

    nodeflowData.addConnection({
      sourceNodeId: from.toString(),
      sourceConnectorId: "O",
      destinationNodeId: to.toString(),
      destinationConnectorId: "I",
      css: getConnectionCSS(fromNode.customData.gender),
    });
  }
};

export const cleanInput = (input?: string): string =>
  !input ? "" : input.trim().replace(/\s+/g, " ");
