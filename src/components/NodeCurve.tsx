import { Component, createEffect, createMemo } from "solid-js";
import {
  CurveFunctions,
  getConnector,
  getSectionFromConnector,
  nodes,
  setNodes,
} from "../utils";
import {
  DrawflowNode,
  NodeConnector,
  Optional,
  PathData,
} from "../drawflow-types";

interface NodeCurveProps {
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: string;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo<DrawflowNode>(() => nodes[props.nodeId]);
  const endNode = createMemo<DrawflowNode>(
    () => nodes[props.destinationNodeId],
  );

  const sourceConnector = createMemo<Optional<NodeConnector>>(() =>
    getConnector(props.nodeId, props.outputId),
  );
  const destinationConnector = createMemo<Optional<NodeConnector>>(() =>
    getConnector(props.destinationNodeId, props.destinationConnectorId),
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

    const { position: startPosition, offset: startNodeOffset } = startNode();
    const { position: endPosition, offset: endNodeOffset } = endNode();

    const outputSection = getSectionFromConnector(
      props.nodeId,
      props.outputId,
    )!;
    const inputSection = getSectionFromConnector(
      props.destinationNodeId,
      props.destinationConnectorId,
    )!;
    const input = inputSection.connectors[props.destinationConnectorId]!;
    const output = outputSection.connectors[props.outputId]!;

    const start = startPosition.add(
      startNodeOffset,
      output.position,
      output.size.divideBy(2),
    );
    const end = endPosition.add(
      endNodeOffset,
      input.position,
      input.size.divideBy(2),
    );

    const path: PathData = {
      start,
      end,
      path: CurveFunctions.createNodePathCurve(start, end),
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: Solid doesn't like this
    setNodes(
      props.nodeId,
      "connectorSections",
      outputSection.id,
      "connectors",
      props.outputId,
      "destinations",
      destinationIndex(),
      "path",
      path,
    );
  });

  return (
    <svg
      style={{
        "z-index": 3,
        position: "absolute",
        width: "1px",
        height: "1px",
        "pointer-events": "none",
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          viewBox="0 0 8 8"
          orient="auto"
          id="pointer"
        >
          <polyline
            points="0,0 4,2 0,4"
            fill="none"
            stroke-width="1"
            stroke="black"
            transform="matrix(1,0,0,1,1,2)"
          />
        </marker>
      </defs>
      <path
        d={sourceConnector()!.destinations[destinationIndex()].path?.path}
        stroke="black"
        stroke-width={1}
        fill="transparent"
        marker-end="url(#pointer)"
        class={props.css}
      />
    </svg>
  );
};
export default NodeCurve;
