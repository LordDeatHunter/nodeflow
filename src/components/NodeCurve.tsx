import { Component, createEffect, createMemo } from "solid-js";
import {
  addPositions,
  convertSizeToPosition,
  CurveFunctions,
  dividePosition,
  getConnector,
  getSectionFromConnector,
  nodes,
  setNodes,
} from "../utils";

interface NodeCurveProps {
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: string;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo(() => nodes[props.nodeId]);
  const endNode = createMemo(() => nodes[props.destinationNodeId]);

  const destinations = createMemo(
    () => getConnector(props.nodeId, props.outputId)?.destinations,
  );
  const destinationIndex = createMemo(() =>
    !startNode() || !endNode()
      ? -1
      : destinations()?.findIndex(
          (destination) =>
            destination.destinationNodeId === props.destinationNodeId &&
            destination.destinationConnectorId === props.destinationConnectorId,
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

    const start = addPositions(
      startPosition,
      startNodeOffset,
      output.position,
      dividePosition(convertSizeToPosition(output.size), 2),
    );

    const end = addPositions(
      endPosition,
      endNodeOffset,
      input.position,
      dividePosition(convertSizeToPosition(input.size), 2),
    );

    const path = {
      start,
      end,
      path: CurveFunctions.createNodePathCurve(start, end),
    };

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
        d={destinations()?.[destinationIndex()].path?.path}
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
