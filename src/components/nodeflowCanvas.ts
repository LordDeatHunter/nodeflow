import { NodeflowData } from "../utils";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import { NodeflowCss } from "../nodeflow-types";
import Vec2 from "../utils/data/Vec2";
import SelectionBox from "./SelectionBox";

interface NodeflowProps {
  css?: NodeflowCss;
  height: string;
  width: string;
}

// const NodeflowCanvas =
//   (nodeflowData: NodeflowData): Component<NodeflowProps> =>
//   (props) => (
//     <div>
//       <div>
//         <For each={Array.from(nodeflowData.nodes.keys())}>
//           {(nodeId) => (
//             <NodeflowNode nodeId={nodeId} nodeflowData={nodeflowData} />
//           )}
//         </For>
//         <svg>
//           <For each={Array.from(nodeflowData.nodes.entries())}>
//             {([nodeId, node]) => (
//               <For each={node.getAllConnectors()}>
//                 {(connector) => (
//                   <For each={connector.destinations.array}>
//                     {(outputConnection) => (
//                       <NodeCurve
//                         nodeflowData={nodeflowData}
//                         sourceNodeId={nodeId}
//                         sourceConnectorId={connector.id}
//                         destinationNodeId={
//                           outputConnection.destinationConnector.parentSection
//                             .parentNode.id
//                         }
//                         destinationConnectorId={
//                           outputConnection.destinationConnector.id
//                         }
//                         css={outputConnection.css}
//                       />
//                     )}
//                   </For>
//                 )}
//               </For>
//             )}
//           </For>
//         </svg>
//         <Show when={nodeflowData.mouseData.heldConnectors.length === 1}>
//           <Curve
//             css={props?.css?.getNewCurveCss?.(nodeflowData.mouseData.heldConnectors.at(0))}
//             nodeflowData={nodeflowData}
//           />
//         </Show>
//       </div>
//       <Show when={nodeflowData.mouseData.selectionBox.boundingBox}>
//         <SelectionBox nodeflowData={nodeflowData} />
//       </Show>
//     </div>
//   );

const createNodeflowCanvas =
  (nodeflowData: NodeflowData) =>
  (props: NodeflowProps): HTMLDivElement => {
    const mainDiv = document.createElement("div");
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

    // nodes go here
    // WIP

    const svg = document.createElement("svg");
    svg.style.zIndex = "2";
    svg.style.position = "absolute";
    svg.style.width = "1px";
    svg.style.height = "1px";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    // node curves and connectors go here
    // WIP

    const resizeObserver = new ResizeObserver(() => {
      nodeflowData.update({
        size: Vec2.of(mainDiv.clientWidth, mainDiv.clientHeight),
        startPosition: Vec2.of(mainDiv.offsetLeft, mainDiv.offsetTop),
      });
    });
    resizeObserver.observe(mainDiv);

    return mainDiv;
  };

export default createNodeflowCanvas;
