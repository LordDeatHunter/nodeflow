import {
  addConnection,
  CurveFunctions,
  drawflow,
  drawflowEventStore,
  DrawflowNodeData,
  SelectableElementCSS,
  SetCurveFunction,
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
  name: string,
  gender: CustomNodeflowDataType["gender"],
  position?: Vec2,
): DrawflowNodeData => {
  const newNode = drawflow.addNode({
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
  newNode.addConnectorSection("inputs", nodeCss.inputsSection, false);
  newNode.addConnectorSection("outputs", nodeCss.outputsSection, false);

  newNode.addConnector(
    "outputs",
    {
      id: "O",
      css:
        gender === "M"
          ? nodeCss.maleOutputConnector
          : nodeCss.femaleOutputConnector,
    },
    false,
  );
  newNode.addConnector(
    "inputs",
    {
      id: "I",
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
    ({ connectorId }, name) =>
      connectorId === "O" && name === "connect-held-nodes",
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
      const heldNodeId = drawflow.mouseData.heldNodeId;
      const heldConnectorId = drawflow.mouseData.heldConnectorId;

      if (!heldNodeId || !heldConnectorId) return;

      fetchRandomData(1).then((data) => {
        const newNode = createFamilyMemberNode(
          data[0].name,
          data[0].gender,
          drawflow.mouseData.globalMousePosition(),
        );

        const parent = drawflow.nodes.get(heldNodeId)!;
        addConnection({
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

  drawflowEventStore.onNodeDataChanged.subscribe(
    "update-node-css",
    ({ nodeId, data }) => {
      if (!drawflow.nodes.has(nodeId) || !("customData" in data)) return;

      const node = drawflow.nodes.get(nodeId)!;
      const customData = data.customData as CustomNodeflowDataType;

      if (!("gender" in customData)) return;
      const gender = customData.gender;

      if (gender === node.customData.gender) return;

      drawflow.updateNode(nodeId, {
        css: {
          normal: gender === "M" ? nodeCss.maleNode : nodeCss.femaleNode,
          selected:
            gender === "M"
              ? nodeCss.selectedMaleNode
              : nodeCss.selectedFemaleNode,
        },
      });

      // TODO: maybe create new connections to the respective connectors of the new gender? Eg. mother->father, father->mother
      drawflow.removeOutgoingConnections(nodeId);
    },
  );

  // Override the default create-connection subscription to only allow one connection per input, and set custom css
  drawflowEventStore.onNodeConnected.subscribe(
    "create-connection",
    ({ outputNodeId, inputNodeId }) => {
      const outputNode = drawflow.nodes.get(outputNodeId)!;
      const inputNode = drawflow.nodes.get(inputNodeId)!;

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

      addConnection({
        sourceNodeId: outputNodeId,
        sourceConnectorId: "O",
        destinationNodeId: inputNodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS(outputNode.customData.gender),
      });
    },
  );

  drawflowEventStore.onPointerUpInNode.subscribe(
    "create-connection",
    ({ nodeId }) => {
      const destinationNode = drawflow.nodes.get(nodeId);
      const sourceId = drawflow.mouseData.heldNodeId;
      if (!destinationNode || !sourceId || nodeId === sourceId) {
        return;
      }

      if (!drawflow.nodes.has(sourceId)) return;
      const sourceNode = drawflow.nodes.get(sourceId)!;

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

      addConnection({
        sourceNodeId: sourceId,
        sourceConnectorId: "O",
        destinationNodeId: nodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS(sourceNode.customData.gender),
      });
    },
  );

  SetCurveFunction("getDefaultCurve", CurveFunctions.getVerticalCurve);
  SetCurveFunction(
    "createNodePathCurve",
    CurveFunctions.createDraggingPathCurve,
  );
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

    addConnection({
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
