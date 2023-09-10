import { Component, createEffect, createMemo } from "solid-js";
import { nodes, setNodes } from "../utils/drawflow-storage";
import {
  addPositions,
  convertSizeToPosition,
  dividePosition,
} from "../utils/math-utils";

interface NodeCurveProps {
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationInputId: string;
  css: string;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo(() => nodes[props.nodeId]);
  const endNode = createMemo(() => nodes[props.destinationNodeId]);

  const destinations = createMemo(
    () => startNode()?.outputs[props.outputId]?.destinations
  );
  const destinationIndex = createMemo(() =>
    !startNode() || !endNode()
      ? -1
      : destinations()?.findIndex(
          (destination) =>
            destination.destinationNodeId === props.destinationNodeId &&
            destination.destinationInputId === props.destinationInputId
        ) ?? -1
  );

  createEffect(() => {
    if (destinationIndex() < 0) {
      return;
    }

    const {
      position: startPosition,
      outputs: startNodeOutputs,
      offset: startNodeOffset,
    } = startNode();
    const {
      position: endPosition,
      inputs: endNodeInputs,
      offset: endNodeOffset,
    } = endNode();

    const output = startNodeOutputs[props.outputId];
    const input = endNodeInputs[props.destinationInputId];

    const start = addPositions(
      startPosition,
      startNodeOffset,
      output.position,
      dividePosition(convertSizeToPosition(output.size), 2)
    );

    const end = addPositions(
      endPosition,
      endNodeOffset,
      input.position,
      dividePosition(convertSizeToPosition(input.size), 2)
    );

    const xCurve = 0;
    const yCurve = (end.y - start.y) / 1.5;

    const path = {
      start,
      end,
      path: `M ${start.x} ${start.y} C ${start.x + xCurve} ${
        start.y + yCurve
      }, ${end.x - xCurve} ${end.y - yCurve}, ${end.x} ${end.y}`,
    };

    setNodes(
      props.nodeId,
      "outputs",
      props.outputId,
      "destinations",
      destinationIndex(),
      "path",
      path
    );
  });

  return (
    <svg
      style={{
        "z-index": 3,
        position: "absolute",
        width: 0,
        height: 0,
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
        d={destinations()[destinationIndex()].path?.path}
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
