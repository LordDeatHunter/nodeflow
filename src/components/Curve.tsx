import { createEffect, createSignal, on } from "solid-js";
import {
    getInputPosition,
    getOutputPosition,
    nodes,
} from "../utils/NodeStorage";
import { shiftPosition } from "../utils/math-utils";

const createCurve = (
  startNodeId: string,
  outputId: string,
  endNodeId: string,
  inputId: string,
  lineWeight = 4
) => {
  const start = shiftPosition(
    getOutputPosition(startNodeId, outputId) ?? { x: 0, y: 0 },
    lineWeight
  );

  const end = shiftPosition(
    getInputPosition(endNodeId, inputId) ?? { x: 0, y: 0 },
    lineWeight
  );

  const xCurve = 0;
  const yCurve = (end.y - start.y) / 1.5;

  return {
    start,
    end,
    path: `M ${start.x} ${start.y} C ${start.x + xCurve} ${start.y + yCurve}, ${
      end.x - xCurve
    } ${end.y - yCurve}, ${end.x} ${end.y}`,
  };
};

const Curve = (props: {
  lineWeight: number;
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationInputId: string;
}) => {
  const {
    lineWeight,
    nodeId,
    outputId,
    destinationNodeId,
    destinationInputId,
  } = props;
  const [curve, setCurve] = createSignal<ReturnType<typeof createCurve>>();

  const startNode = nodes()[nodeId];
  const endNode = nodes()[destinationNodeId];

  const updateCurve = () => {
    setCurve(
      createCurve(
        nodeId,
        outputId,
        destinationNodeId,
        destinationInputId,
        lineWeight
      )
    );
  };

  createEffect(on(startNode.position.get, () => updateCurve()));
  createEffect(on(endNode.position.get, () => updateCurve()));

  return (
    <svg
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        "z-index": 1,
        "pointer-events": "none",
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
            points="0,4 4,2 0,0"
            fill="none"
            stroke-width="1"
            stroke="black"
            transform="matrix(1,0,0,1,1,2)"
          ></polyline>
        </marker>
      </defs>
      <path
        d={curve()?.path}
        stroke="black"
        stroke-width={lineWeight}
        fill="transparent"
        marker-end="url(#pointer)"
      />
    </svg>
  );
};
export default Curve;
