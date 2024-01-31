import { Component, createEffect, createMemo, Show } from "solid-js";
import { NodeflowData } from "../utils";
import { Optional, SelectableElementCSS } from "../nodeflow-types";
import NodeConnector from "../utils/data/NodeConnector";
import NodeflowNodeData from "../utils/data/NodeflowNodeData";

interface NodeCurveProps {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
  nodeflowData: NodeflowData;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo<NodeflowNodeData>(
    () => props.nodeflowData.nodes.get(props.sourceNodeId)!,
  );
  const endNode = createMemo<NodeflowNodeData>(
    () => props.nodeflowData.nodes.get(props.destinationNodeId)!,
  );

  const sourceConnector = createMemo<Optional<NodeConnector>>(() =>
    startNode().getConnector(props.sourceConnectorId),
  );
  const destinationConnector = createMemo<Optional<NodeConnector>>(() =>
    endNode().getConnector(props.destinationConnectorId),
  );

  const destinationIndex = createMemo<number>(() =>
    !startNode() || !endNode()
      ? -1
      : sourceConnector()?.destinations?.findIndex(
          (destination) =>
            destination.destinationConnector === destinationConnector(),
        ) ?? -1,
  );

  createEffect(() => {
    if (destinationIndex() < 0) {
      return;
    }
    const { curveFunctions } = props.nodeflowData;

    const output = startNode().getConnector(props.sourceConnectorId)!;
    const input = endNode().getConnector(props.destinationConnectorId)!;

    const start = output.getCenter();
    const end = input.getCenter();

    const { anchorStart, anchorEnd } = curveFunctions.calculateCurveAnchors(
      start,
      end,
      startNode().getCenter(),
      endNode().getCenter(),
    );

    sourceConnector()!.destinations.get(destinationIndex()).path = {
      start,
      end,
      anchorStart,
      anchorEnd,
      path: curveFunctions.createDefaultCurvePath(
        start,
        end,
        anchorStart,
        anchorEnd,
      ),
    };
  });

  return (
    <>
      <path
        onPointerDown={(event) => {
          props.nodeflowData.eventStore.onPointerDownInNodeCurve.publish({
            event,
            sourceConnector: sourceConnector()!,
            destinationConnector: destinationConnector()!,
          });
        }}
        d={sourceConnector()!.destinations.get(destinationIndex()).path?.path}
        stroke="black"
        stroke-width={1}
        fill="none"
        classList={{
          [props.css?.normal ?? ""]: true,
          [props.css?.selected ?? ""]:
            props.nodeflowData.mouseData.heldConnection?.sourceConnector
              .parentSection.parentNode.id === props.sourceNodeId &&
            props.nodeflowData.mouseData.heldConnection?.sourceConnector.id ===
              props.sourceConnectorId &&
            props.nodeflowData.mouseData.heldConnection?.destinationConnector
              .parentSection.parentNode.id === props.destinationNodeId &&
            props.nodeflowData.mouseData.heldConnection?.destinationConnector
              .id === props.destinationConnectorId,
        }}
        style={{
          cursor: "pointer",
          "pointer-events": "visibleStroke",
        }}
      />
      <Show when={props.nodeflowData.settings.debugMode}>
        <circle
          cx={
            sourceConnector()!.destinations.get(destinationIndex()).path
              ?.anchorStart?.x
          }
          cy={
            sourceConnector()!.destinations.get(destinationIndex()).path
              ?.anchorStart?.y
          }
          r={4}
          fill="none"
          class={props.css?.normal ?? ""}
        />
        <circle
          cx={
            sourceConnector()!.destinations.get(destinationIndex()).path
              ?.anchorEnd?.x
          }
          cy={
            sourceConnector()!.destinations.get(destinationIndex()).path
              ?.anchorEnd?.y
          }
          r={4}
          fill="none"
          class={props.css?.normal ?? ""}
        />
      </Show>
    </>
  );
};
export default NodeCurve;
