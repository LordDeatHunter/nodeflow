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

    const resizeObserver = new ResizeObserver(() => {
      nodeflowData.update({
        size: Vec2.of(mainDiv.clientWidth, mainDiv.clientHeight),
        startPosition: Vec2.of(mainDiv.offsetLeft, mainDiv.offsetTop),
      });
    });
    resizeObserver.observe(mainDiv);

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
    nodeflowDiv.style.transformOrigin = "center";
    nodeflowDiv.style.transition = "scale 0.1s ease-out";
    nodeflowDiv.style.transform = `scale(${nodeflowData.zoomLevel}) translate(${nodeflowData.position.x}px, ${nodeflowData.position.y}px)`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.zIndex = "2";
    svg.style.position = "absolute";
    svg.style.width = "1px";
    svg.style.height = "1px";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    nodeflowDiv.appendChild(svg);

    nodeflowData.eventStore.onNodeAdded.subscribe(
      "nodeflow-canvas",
      ({ nodeId }) => {
        const nodeDiv = NodeflowNode({ nodeId, nodeflowData });
        nodeflowDiv.insertBefore(nodeDiv, svg);
      },
    );

    nodeflowData.eventStore.onNodeRemoved.subscribe(
      "nodeflow-canvas",
      ({ nodeId }) => {
        const nodeDiv = document.getElementById(`node-${nodeId}`);
        if (nodeDiv) {
          nodeflowDiv.removeChild(nodeDiv);
        }

        const curves = Array.from(svg.children).filter((child) =>
          child.classList.contains("nodeflow-connection"),
        );

        curves.forEach((curve) => {
          const sourceNodeId = curve.getAttribute("data-source-node-id");
          const destinationNodeId = curve.getAttribute(
            "data-destination-node-id",
          );
          if (sourceNodeId === nodeId || destinationNodeId === nodeId) {
            svg.removeChild(curve);
          }
        });
      },
    );

    nodeflowData.eventStore.onConnectionAdded.subscribe(
      "nodeflow-canvas",
      ({
        sourceNodeId,
        sourceConnectorId,
        destinationNodeId,
        destinationConnectorId,
      }) => {
        const curve = NodeCurve({
          nodeflowData,
          sourceNodeId,
          sourceConnectorId,
          destinationNodeId,
          destinationConnectorId,
          // TODO: REIMPLEMENT
          css: {
            normal: "nodeflow-connection",
            selected: "nodeflow-connection-selected",
          },
        });
        svg.appendChild(curve);
      },
    );

    nodeflowData.eventStore.onConnectionRemoved.subscribe(
      "nodeflow-canvas",
      ({ sourceNodeId, destinationNodeId }) => {
        Array.from(svg.children)
          .filter((child) => child.classList.contains("nodeflow-connection"))
          .forEach((curve) => {
            const sourceNodeIdAttr = curve.getAttribute("data-source-node-id");
            const destinationNodeIdAttr = curve.getAttribute(
              "data-destination-node-id",
            );

            if (
              sourceNodeIdAttr === sourceNodeId &&
              destinationNodeIdAttr === destinationNodeId
            ) {
              svg.removeChild(curve);
            }
          });
      },
    );

    nodeflowData.eventStore.onNodeflowMoved.subscribe(
      "nodeflow-canvas",
      ({ position }) => {
        nodeflowDiv.style.transform = `scale(${nodeflowData.zoomLevel}) translate(${position.x}px, ${position.y}px)`;
      },
    );

    // TODO: REIMPLEMENT
    // const selectionBox = SelectionBox({ nodeflowData });
    // nodeflowDiv.appendChild(selectionBox);

    mainDiv.appendChild(nodeflowDiv);

    return mainDiv;
  };

export default NodeflowCanvas;
