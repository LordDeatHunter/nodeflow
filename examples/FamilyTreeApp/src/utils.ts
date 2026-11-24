import {
  Changes,
  NodeflowNodeData,
  SelectableElementCSS,
  Vec2,
} from "@nodeflow-lib/solid";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import NodeBody from "./components/NodeBody";
import { nodeflowData } from "./App";
import { computeTreeLayout } from "./treeLayout";

/** Whether `ancestor` is `node` or one of its parents, grandparents, etc. */
const isAncestorOf = (
  ancestor: NodeflowNodeData,
  node: NodeflowNodeData,
): boolean => {
  const visited = new Set<string>();
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.id === ancestor.id) return true;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    stack.push(...current.getAllSourceNodes());
  }

  return false;
};

/**
 * Whether `parent` may be linked as one of `child`'s parents: the child has at
 * most one other parent, of the other gender, and the link would not make
 * anyone their own ancestor.
 */
const canBeParentOf = (
  parent: NodeflowNodeData,
  child: NodeflowNodeData,
): boolean => {
  const sources = child.getConnector("I")?.sources ?? [];

  return (
    sources.length < 2 &&
    !sources.some(
      (source) =>
        source.sourceConnector.parentNode.customData.gender ===
        parent.customData.gender,
    ) &&
    !isAncestorOf(child, parent)
  );
};

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

/** `nodeId` and everyone descended from them. */
export const getBranch = (nodeId: string): Array<string> => {
  const branch = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeflowData.nodes.get(id);
    if (!node || branch.has(id)) continue;

    branch.add(id);
    node.getAllDestinationNodes().forEach((child) => queue.push(child.id));
  }

  return Array.from(branch);
};

/** Groups a person with all their descendants into a collapsible frame. */
export const groupBranch = (nodeId: string) => {
  const root = nodeflowData.nodes.get(nodeId);
  if (!root) return undefined;

  return nodeflowData.addGroup(getBranch(nodeId), {
    title: `${root.customData.name}'s branch`,
    css: {
      frame: nodeCss.groupFrame,
      header: nodeCss.groupHeader,
      collapsed: nodeCss.groupCollapsed,
      selected: nodeCss.groupSelected,
    },
  });
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
          css: getConnectionCSS(heldNode.customData.gender),
        });
      });
    },
    1,
  );

  // Override the default create-connection subscription to only allow one connection per input, and set custom css
  nodeflowData.eventStore.onNodeConnected.subscribe(
    "nodeflow:create-connection",
    ({ outputNodeId, inputNodeId }) => {
      const outputNode = nodeflowData.nodes.get(outputNodeId)!;
      const inputNode = nodeflowData.nodes.get(inputNodeId)!;

      if (!canBeParentOf(outputNode, inputNode)) return;

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

      if (!canBeParentOf(sourceNode, destinationNode)) return;

      nodeflowData.addConnection({
        sourceNodeId: sourceNode.id,
        sourceConnectorId: "O",
        destinationNodeId: nodeId,
        destinationConnectorId: "I",
        css: getConnectionCSS(sourceNode.customData.gender),
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

    // Random links could otherwise make someone their own ancestor, which
    // a family tree (and sorting it into generations) can't represent.
    if (!canBeParentOf(fromNode, toNode)) continue;

    nodeflowData.addConnection({
      sourceNodeId: from.toString(),
      sourceConnectorId: "O",
      destinationNodeId: to.toString(),
      destinationConnectorId: "I",
      css: getConnectionCSS(fromNode.customData.gender),
    });
  }
};

/** Screen pixels kept free around the tree when zooming out to fit it. */
const FIT_MARGIN = 48;

const moveNodes = (positions: Map<string, Vec2>) =>
  positions.forEach((position, id) => {
    const node = nodeflowData.nodes.get(id);
    if (node) node.position = position;
  });

/** Pans the viewport so `point` (in world space) sits in its middle. */
const centerViewportOn = (point: Vec2) => {
  nodeflowData.position = nodeflowData.size
    .divideBy(2)
    .divideBy(nodeflowData.zoomLevel)
    .subtract(point);
};

/**
 * Rearranges every node into a family tree (one row per generation, partners
 * side by side, children centered below their parents) around the canvas
 * origin, then fits it in the viewport. Undo restores the old positions.
 */
export const sortTree = () => {
  const nodes = [...nodeflowData.nodes.values()];
  if (nodes.length === 0) return;

  const { positions, size } = computeTreeLayout(
    nodes.map((node) => {
      const outerSize = node.size.add(node.offset.multiplyBy(2));
      return {
        id: node.id,
        width: outerSize.x,
        height: outerSize.y,
        x: node.getCenter().x,
        gender: node.customData.gender,
      };
    }),
    nodeflowData
      .serializeConnections()
      .map(({ sourceNodeId, destinationNodeId }) => ({
        parent: sourceNodeId,
        child: destinationNodeId,
      })),
  );

  const previous = new Map(nodes.map((node) => [node.id, node.position]));
  nodeflowData.changes.addChange({
    type: "update",
    source: "node",
    historyGroup: Changes.createHistoryGroup(),
    applyChange: () => moveNodes(positions),
    undoChange: () => moveNodes(previous),
  });
  moveNodes(positions);

  const fit = Math.min(
    (nodeflowData.size.x - 2 * FIT_MARGIN) / size.x,
    (nodeflowData.size.y - 2 * FIT_MARGIN) / size.y,
  );
  if (fit < nodeflowData.zoomLevel) {
    nodeflowData.zoomLevel = Math.max(fit, nodeflowData.settings.minZoom);
  }
  centerViewportOn(Vec2.zero());
};

export const cleanInput = (input?: string): string =>
  !input ? "" : input.trim().replace(/\s+/g, " ");
