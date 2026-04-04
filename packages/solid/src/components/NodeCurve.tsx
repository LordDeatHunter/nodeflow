import { Component, createEffect, createMemo, Show } from "solid-js";
import {
  NodeflowData,
  Optional,
  SelectableElementCSS,
  NodeConnector,
  NodeflowNodeData,
} from "@nodeflow/core";

interface NodeCurveProps {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
  nodeflowData: NodeflowData;
  tick: () => number;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo<NodeflowNodeData>(() => {
    props.tick();
    return props.nodeflowData.nodes.get(props.sourceNodeId)!;
  });
  const endNode = createMemo<NodeflowNodeData>(() => {
    props.tick();
    return props.nodeflowData.nodes.get(props.destinationNodeId)!;
  });

  const sourceConnector = createMemo<Optional<NodeConnector>>(() => {
    props.tick();
    return startNode()?.getConnector(props.sourceConnectorId);
  });
  const destinationConnector = createMemo<Optional<NodeConnector>>(() => {
    props.tick();
    return endNode()?.getConnector(props.destinationConnectorId);
  });

  const destinationIndex = createMemo<number>(() => {
    props.tick();
    if (!startNode() || !endNode()) return -1;
    return (
      sourceConnector()?.destinations?.findIndex(
        (destination) =>
          destination.destinationConnector === destinationConnector(),
      ) ?? -1
    );
  });

  const pathData = createMemo(() => {
    props.tick();
    if (destinationIndex() < 0) return undefined;

    const { curveFunctions } = props.nodeflowData;

    const output = startNode()?.getConnector(props.sourceConnectorId);
    const input = endNode()?.getConnector(props.destinationConnectorId);
    if (!output || !input) return undefined;

    const start = output.getCenter();
    const end = input.getCenter();

    const { anchorStart, anchorEnd } = curveFunctions.calculateCurveAnchors(
      start,
      end,
      startNode().getCenter(),
      endNode().getCenter(),
    );

    const path = curveFunctions.createDefaultCurvePath(
      start,
      end,
      anchorStart,
      anchorEnd,
    );

    const dest = sourceConnector()?.destinations.get(destinationIndex());
    if (dest) {
      dest.path = { start, end, anchorStart, anchorEnd, path };
    }

    return path;
  });

  const isSelected = createMemo(() => {
    props.tick();
    return props.nodeflowData.mouseData.hasSelectedConnection(
      props.sourceNodeId,
      props.sourceConnectorId,
      props.destinationNodeId,
      props.destinationConnectorId,
    );
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
        d={pathData()}
        stroke="black"
        stroke-width={1}
        fill="none"
        classList={{
          [props.css?.normal ?? ""]: true,
          [props.css?.selected ?? ""]: isSelected(),
        }}
        style={{
          cursor: "pointer",
          "pointer-events": "visibleStroke",
        }}
      />
      <Show when={props.nodeflowData.settings.debugMode}>
        {(() => {
          const dest = createMemo(() => {
            props.tick();
            return sourceConnector()?.destinations.get(destinationIndex());
          });
          return (
            <>
              <circle
                cx={dest()?.path?.anchorStart?.x}
                cy={dest()?.path?.anchorStart?.y}
                r={4}
                fill="none"
                class={props.css?.normal ?? ""}
              />
              <circle
                cx={dest()?.path?.anchorEnd?.x}
                cy={dest()?.path?.anchorEnd?.y}
                r={4}
                fill="none"
                class={props.css?.normal ?? ""}
              />
            </>
          );
        })()}
      </Show>
    </>
  );
};
export default NodeCurve;
