import { NodeflowData } from "../utils";
import Vec2 from "../utils/data/Vec2";
import Connector from "./Connector";

// TODO: Probably better to pass the node data directly instead of the id.
interface NodeProps {
  nodeId: string;
  nodeflowData: NodeflowData;
}

const NodeflowNode = (props: NodeProps): HTMLDivElement => {
  // TODO: REACTIVITY
  const node = props.nodeflowData.nodes.get(props.nodeId)!;
  // let isVisible = false;

  // TODO: REACTIVITY
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

  // when the element is loaded
  div.addEventListener("load", () => {
    const resizeObserver = new ResizeObserver(() => {
      node.update({
        // update the size of the node
        size: Vec2.of(div.clientWidth, div.clientHeight),
      });

      // update the position of the connectors
      Array.from(node.connectorSections.values()).forEach((section) =>
        Array.from(section.connectors.values()).forEach((connector) => {
          const connectorEl = connector.ref;
          if (!connectorEl) return;

          connector.position = Vec2.of(
            (connectorEl?.parentElement?.offsetLeft ?? 0) +
              connectorEl.offsetLeft,
            (connectorEl?.parentElement?.offsetTop ?? 0) +
              connectorEl.offsetTop,
          );
        }),
      );
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

    // isVisible = true;
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

  node.connectorSections.entries().forEach(([sectionId, section]) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.classList.add(section?.css ?? "nodeflowConnectorSection");
    sectionDiv.id = `section-${sectionId}`;

    if (section?.css) {
      sectionDiv.classList.add(section.css);
    }

    section.connectors.entries().forEach(([connectorId, connector]) => {
      const connectorEl = Connector({
        connector,
        connectorId,
        nodeId: props.nodeId,
        sectionId,
        nodeflowData: props.nodeflowData,
      });
      sectionDiv.appendChild(connectorEl);
    });

    div.appendChild(sectionDiv);
  });

  return div;
};

export default NodeflowNode;
