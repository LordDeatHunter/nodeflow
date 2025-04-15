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

  const sourceConnector = () =>
    startNode().getConnector(props.sourceConnectorId);
  const destinationConnector = () =>
    endNode().getConnector(props.destinationConnectorId);

  const destinationIndex = () =>
    !startNode() || !endNode()
      ? -1
      : sourceConnector()?.destinations?.findIndex(
          (destination) =>
            destination.destinationConnector === destinationConnector(),
        ) ?? -1;

  // TODO: REACTIVITY
  // createEffect(() => {
  //   if (destinationIndex() < 0) {
  //     return;
  //   }
  //   const { curveFunctions } = props.nodeflowData;
  //
  //   const output = startNode().getConnector(props.sourceConnectorId)!;
  //   const input = endNode().getConnector(props.destinationConnectorId)!;
  //
  //   const start = output.getCenter();
  //   const end = input.getCenter();
  //
  //   const { anchorStart, anchorEnd } = curveFunctions.calculateCurveAnchors(
  //     start,
  //     end,
  //     startNode().getCenter(),
  //     endNode().getCenter(),
  //   );
  //
  //   sourceConnector()!.destinations.get(destinationIndex()).path = {
  //     start,
  //     end,
  //     anchorStart,
  //     anchorEnd,
  //     path: curveFunctions.createDefaultCurvePath(
  //       start,
  //       end,
  //       anchorStart,
  //       anchorEnd,
  //     ),
  //   };
  // });

  const pathSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );

  const path = sourceConnector()!.destinations.at(destinationIndex())?.path
    ?.path;

  if (path) {
    pathSvg.setAttribute("d", path);
  }
  pathSvg.setAttribute("stroke", "black");
  pathSvg.setAttribute("stroke-width", "1");
  pathSvg.setAttribute("fill", "none");

  pathSvg.style.cursor = "pointer";
  pathSvg.style.pointerEvents = "visibleStroke";

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
      sourceConnector: sourceConnector()!,
      destinationConnector: destinationConnector()!,
    });
  });

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
