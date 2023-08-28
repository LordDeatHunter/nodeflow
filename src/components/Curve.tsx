import { createEffect } from "solid-js";
import { nodes, setNodes } from "../utils/drawflow-storage";
import {
  addPositions,
  convertSizeToPosition,
  dividePosition,
} from "../utils/math-utils";
import { produce } from "solid-js/store";

interface CurveProps {
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationInputId: string;
  css: string;
}

const Curve = (props: CurveProps) => {
  const { nodeId, outputId, destinationNodeId, destinationInputId } = props;

  const startNode = nodes[nodeId];
  const endNode = nodes[destinationNodeId];
  if (!startNode || !endNode) return;
  const destination = startNode.outputs[outputId]?.destinations?.find(
    (destination) =>
      destination.destinationNodeId === destinationNodeId &&
      destination.destinationInputId === destinationInputId
  );
  if (!destination) return;

  createEffect(() => {
    const output = startNode.outputs[outputId];
    const input = endNode.inputs[destinationInputId];

    const start = addPositions(
      startNode.position,
      output.position,
      dividePosition(convertSizeToPosition(output.size), 2)
    );

    const end = addPositions(
      endNode.position,
      input.position,
      dividePosition(convertSizeToPosition(output.size), 2)
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
      nodeId,
      "outputs",
      outputId,
      "destinations",
      produce((destinations) => {
        const destination = destinations.find(
          (destination) =>
            destination.destinationNodeId === destinationNodeId &&
            destination.destinationInputId === destinationInputId
        );
        if (destination) {
          destination.path = path;
        }
      })
    );
  });

  return (
    <svg
      style={{
        "z-index": 3,
        position: "absolute",
        width: "100%",
        height: "100%",
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
          ></polyline>
        </marker>
      </defs>
      <path
        d={destination?.path?.path}
        stroke="black"
        stroke-width={1}
        fill="transparent"
        marker-end="url(#pointer)"
        class={props.css}
      />
    </svg>
  );
};
export default Curve;
