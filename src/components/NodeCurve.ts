import { NodeflowData } from "../utils";
import { SelectableElementCSS } from "../nodeflow-types";

interface NodeCurveProps {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
  nodeflowData: NodeflowData;
}

const NodeCurve = (props: NodeCurveProps) => {
  // TODO: REACTIVITY
  const startNode = () => props.nodeflowData.nodes.get(props.sourceNodeId)!;
  const endNode = () => props.nodeflowData.nodes.get(props.destinationNodeId)!;

  const getSourceConnector = () =>
    startNode().getConnector(props.sourceConnectorId);
  const getDestinationConnector = () =>
    endNode().getConnector(props.destinationConnectorId);

  const getDestinationIndex = () =>
    !startNode() || !endNode()
      ? -1
      : getSourceConnector()?.destinations?.findIndex(
          (destination) =>
            destination.destinationConnector === getDestinationConnector(),
        ) ?? -1;

  const pathSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );

  pathSvg.setAttribute("data-source-node-id", props.sourceNodeId);
  pathSvg.setAttribute("data-source-connector-id", props.sourceConnectorId);
  pathSvg.setAttribute("data-destination-node-id", props.destinationNodeId);
  pathSvg.setAttribute(
    "data-destination-connector-id",
    props.destinationConnectorId,
  );

  const sourceConnector = getSourceConnector()!;
  const destinationConnector = getDestinationConnector()!;

  const destinationIndex = getDestinationIndex();
  if (
    destinationIndex < 0 ||
    destinationIndex >= sourceConnector.destinations.length
  ) {
    return pathSvg;
  }

  const start = sourceConnector.getCenter();
  const end = destinationConnector.getCenter();
  const { anchorStart, anchorEnd } =
    props.nodeflowData.curveFunctions.calculateCurveAnchors(
      start,
      end,
      startNode().getCenter(),
      endNode().getCenter(),
    );
  const path = props.nodeflowData.curveFunctions.createDefaultCurvePath(
    start,
    end,
    anchorStart,
    anchorEnd,
  );
  if (path) {
    sourceConnector.destinations[destinationIndex].path = {
      start,
      end,
      anchorStart,
      anchorEnd,
      path,
    };
    pathSvg.setAttribute("d", path);
  }

  pathSvg.setAttribute("stroke", "black");
  pathSvg.setAttribute("stroke-width", "1");
  pathSvg.setAttribute("fill", "none");

  pathSvg.style.cursor = "pointer";
  pathSvg.style.pointerEvents = "visiblestroke";

  if (
    props.css?.selected &&
    props.nodeflowData.mouseData.hasSelectedConnection(
      props.sourceNodeId,
      props.sourceConnectorId,
      props.destinationNodeId,
      props.destinationConnectorId,
    )
  ) {
    pathSvg.classList.add(props.css.selected);
  }

  if (props.css?.normal) {
    pathSvg.classList.add(props.css.normal);
  }

  pathSvg.addEventListener("pointerdown", (event) => {
    props.nodeflowData.eventStore.onPointerDownInNodeCurve.publish({
      event,
      sourceConnector,
      destinationConnector,
    });
  });

  props.nodeflowData.eventStore.onNodeMoved.subscribe(
    `nodeflow-curve-${props.sourceNodeId}-${props.destinationNodeId}-${props.sourceConnectorId}-${props.destinationConnectorId}`,
    ({ nodeId }) => {
      if (nodeId !== props.sourceNodeId && nodeId !== props.destinationNodeId) {
        return;
      }

      if (!sourceConnector || !destinationConnector) {
        return;
      }

      const start = sourceConnector.getCenter();
      const end = destinationConnector.getCenter();
      const { anchorStart, anchorEnd } =
        props.nodeflowData.curveFunctions.calculateCurveAnchors(
          start,
          end,
          startNode().getCenter(),
          endNode().getCenter(),
        );
      const path = props.nodeflowData.curveFunctions.createDefaultCurvePath(
        start,
        end,
        anchorStart,
        anchorEnd,
      );

      sourceConnector.destinations[destinationIndex].path = {
        start,
        end,
        anchorStart,
        anchorEnd,
        path,
      };

      pathSvg.setAttribute("d", path);
    },
  );

  // return (
  //   <Show when={props.nodeflowData.settings.debugMode}>
  //     <circle
  //       cx={
  //         sourceConnector()!.destinations.get(destinationIndex()).path
  //           ?.anchorStart?.x
  //       }
  //       cy={
  //         sourceConnector()!.destinations.get(destinationIndex()).path
  //           ?.anchorStart?.y
  //       }
  //       r={4}
  //       fill="none"
  //       class={props.css?.normal ?? ""}
  //     />
  //     <circle
  //       cx={
  //         sourceConnector()!.destinations.get(destinationIndex()).path
  //           ?.anchorEnd?.x
  //       }
  //       cy={
  //         sourceConnector()!.destinations.get(destinationIndex()).path
  //           ?.anchorEnd?.y
  //       }
  //       r={4}
  //       fill="none"
  //       class={props.css?.normal ?? ""}
  //     />
  //   </Show>
  // );

  return pathSvg;
};

export default NodeCurve;
