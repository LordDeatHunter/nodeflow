import { NodeflowData } from "../utils";
import Vec2 from "../utils/data/Vec2";
import Connector from "./Connector";

// TODO: Probably better to pass the node data directly instead of the id.
interface NodeProps {
  nodeId: string;
  nodeflowData: NodeflowData;
}

const addConnector = (
  sectionDiv: HTMLDivElement,
  nodeflowData: NodeflowData,
  nodeId: string,
  sectionId: string,
  connectorId: string,
) => {
  const node = nodeflowData.nodes.get(nodeId);
  if (!node) return;

  const section = node.connectorSections.get(sectionId);
  if (!section) return;

  const connector = section.connectors.get(connectorId);
  if (!connector) return;

  const connectorEl = Connector({
    connector,
    connectorId,
    nodeId,
    sectionId,
    nodeflowData,
  });

  if (!connectorEl) return;

  sectionDiv.appendChild(connectorEl);

  return connectorEl;
};

const addConnectorSection = (
  nodeDiv: HTMLDivElement,
  nodeflowData: NodeflowData,
  nodeId: string,
  sectionId: string,
) => {
  const node = nodeflowData.nodes.get(nodeId);
  if (!node) return;

  const section = node.connectorSections.get(sectionId);
  if (!section) return;

  const sectionDiv = document.createElement("div");
  sectionDiv.classList.add("nodeflowConnectorSection");
  sectionDiv.id = `section-${sectionId}`;

  if (section?.css) {
    sectionDiv.classList.add(section.css);
  }

  Array.from(section.connectors.values()).forEach((connector) => {
    addConnector(sectionDiv, nodeflowData, nodeId, sectionId, connector.id);
  });

  nodeDiv.appendChild(sectionDiv);

  return sectionDiv;
};

const NodeflowNode = (props: NodeProps): HTMLDivElement => {
  const node = props.nodeflowData.nodes.get(props.nodeId)!;

  // TODO: REIMPLEMENT
  // let isVisible = false;

  // TODO: REIMPLEMENT
  // onCleanup(() => {
  //   props.nodeflowData.chunking.removeNodeFromChunk(
  //     props.nodeId,
  //     node().position,
  //   );
  //
  //   if (!node().resizeObserver) return;
  //
  //   node().resizeObserver!.disconnect();
  //
  //   Array.from(node().connectorSections.values()).forEach((section) => {
  //     Array.from(section.connectors.values()).forEach((connector) => {
  //       if (!connector.resizeObserver) return;
  //       connector.resizeObserver.disconnect();
  //     });
  //   });
  // });

  const div = document.createElement("div");

  div.style.left = `${node.position.x}px`;
  div.style.top = `${node.position.y}px`;

  const resizeObserver = new ResizeObserver(() => {
    node.update({
      size: Vec2.of(div.clientWidth, div.clientHeight),
    });
  });

  Array.from(node.connectorSections.values()).forEach((section) => {
    addConnectorSection(div, props.nodeflowData, props.nodeId, section.id);
  });
  resizeObserver.observe(div);

  const positionOffset = node.centered
    ? Vec2.of(div.clientWidth, div.clientHeight).divideBy(2)
    : Vec2.zero();

  node.update({
    offset: Vec2.of(div.clientLeft, div.clientTop),
    resizeObserver,
    position: node.position.subtract(positionOffset),
    size: Vec2.of(div.clientWidth, div.clientHeight),
  });

  div.id = `node-${props.nodeId}`;
  div.classList.add("nodeflowNode");

  // TODO: REACTIVITY
  const normalCss = node?.css?.normal;
  if (normalCss) {
    div.classList.add(normalCss);
  }

  // TODO: REACTIVITY
  const selectedCss = node?.css?.selected;
  if (
    selectedCss &&
    (props.nodeflowData.mouseData.hasSelectedNode(props.nodeId) ||
      props.nodeflowData.mouseData.selectionBox.selections.isNodeSelected(
        props.nodeId,
      ))
  ) {
    div.classList.add(selectedCss);
  }

  div.addEventListener("mousedown", (event) => {
    props.nodeflowData.eventStore.onMouseDownInNode.publish({
      event,
      nodeId: props.nodeId,
    });
  });

  div.addEventListener("touchstart", (event) => {
    props.nodeflowData.eventStore.onTouchStartInNode.publish({
      event,
      nodeId: props.nodeId,
    });
  });

  div.addEventListener("pointerup", (event) => {
    props.nodeflowData.eventStore.onPointerUpInNode.publish({
      event,
      nodeId: props.nodeId,
    });
  });

  const nodeDisplay = node.display({ node });
  if (nodeDisplay) {
    div.appendChild(nodeDisplay);
  }

  props.nodeflowData.eventStore.onConnectorSectionAdded.subscribe(
    `nodeflow-node-${props.nodeId}-section-added`,
    ({ nodeId, sectionId }) => {
      if (nodeId !== props.nodeId) return;

      addConnectorSection(div, props.nodeflowData, nodeId, sectionId);
    },
  );

  props.nodeflowData.eventStore.onConnectorAdded.subscribe(
    `nodeflow-node-${props.nodeId}`,
    ({ nodeId, sectionId, connectorId }) => {
      if (nodeId !== props.nodeId) return;

      const sectionDiv = div.querySelector<HTMLDivElement>(
        `#section-${sectionId}`,
      );
      if (!sectionDiv) return;

      addConnector(
        sectionDiv,
        props.nodeflowData,
        nodeId,
        sectionId,
        connectorId,
      );
    },
  );

  props.nodeflowData.eventStore.onNodeMoved.subscribe(
    `nodeflow-node-${props.nodeId}`,
    ({ nodeId, position }) => {
      if (nodeId === props.nodeId) {
        div.style.left = `${position.x}px`;
        div.style.top = `${position.y}px`;
      }
    },
  );

  return div;
};

export default NodeflowNode;
