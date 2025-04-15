import { NodeflowData } from "../utils";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import { NodeflowCss } from "../nodeflow-types";
import Vec2 from "../utils/data/Vec2";

interface NodeflowProps {
  css?: NodeflowCss;
  height: string;
  width: string;
}

const NodeflowCanvas =
  (nodeflowData: NodeflowData) =>
  (props: NodeflowProps): HTMLDivElement => {
    const mainDiv = document.createElement("div");

    // TODO: REACTIVITY
    mainDiv.addEventListener("load", () => {
      const resizeObserver = new ResizeObserver(() => {
        nodeflowData.update({
          size: Vec2.of(mainDiv.clientWidth, mainDiv.clientHeight),
          startPosition: Vec2.of(mainDiv.offsetLeft, mainDiv.offsetTop),
        });
      });
      resizeObserver.observe(mainDiv);
    });

    mainDiv.id = `nodeflow-${nodeflowData.id}`;
    mainDiv.tabIndex = 0;

    if (props?.css?.nodeflow) {
      mainDiv.className = props.css.nodeflow;
    }

    mainDiv.style.height = props.height;
    mainDiv.style.width = props.width;
    mainDiv.style.overflow = "hidden";

    mainDiv.addEventListener("mousemove", (event) => {
      nodeflowData.eventStore.onMouseMoveInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("pointerup", (event) => {
      nodeflowData.eventStore.onPointerUpInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("wheel", (event) => {
      nodeflowData.eventStore.onWheelInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("mousedown", (event) => {
      nodeflowData.eventStore.onMouseDownInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("keydown", (event) => {
      nodeflowData.eventStore.onKeyDownInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("keyup", (event) => {
      nodeflowData.eventStore.onKeyUpInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("touchstart", (event) => {
      nodeflowData.eventStore.onTouchStartInNodeflow.publish({ event });
    });
    mainDiv.addEventListener("touchmove", (event) => {
      nodeflowData.eventStore.onTouchMoveInNodeflow.publish({ event });
    });

    const nodeflowDiv = document.createElement("div");
    nodeflowDiv.style.position = "absolute";
    nodeflowDiv.style.transform = `scale(${nodeflowData.zoomLevel}) translate(${nodeflowData.position.x}px, ${nodeflowData.position.y}px)`;
    nodeflowDiv.style.transformOrigin = "center";
    nodeflowDiv.style.transition = "scale 0.1s ease-out";

    nodeflowData.nodes.forEach((node) => {
      const nodeDiv = NodeflowNode({ nodeId: node.id, nodeflowData });
      nodeflowDiv.appendChild(nodeDiv);
    });

    const svg = document.createElement("svg");
    svg.style.zIndex = "2";
    svg.style.position = "absolute";
    svg.style.width = "1px";
    svg.style.height = "1px";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    nodeflowDiv.appendChild(svg);

    nodeflowData.nodes.entries().forEach(([nodeId, node]) => {
      node.getAllConnectors().forEach((connector) => {
        connector.destinations.forEach((outputConnection) => {
          const curve = NodeCurve({
            nodeflowData,
            sourceNodeId: nodeId,
            sourceConnectorId: connector.id,
            destinationNodeId:
              outputConnection.destinationConnector.parentSection.parentNode.id,
            destinationConnectorId: outputConnection.destinationConnector.id,
            css: outputConnection.css,
          });
          svg.appendChild(curve);
        });
      });
    });

    nodeflowDiv.appendChild(svg);

    // const selectionBox = SelectionBox({ nodeflowData });
    // TODO: REACTIVITY
    // nodeflowDiv.appendChild(selectionBox);

    mainDiv.appendChild(nodeflowDiv);

    return mainDiv;
  };

export default NodeflowCanvas;
