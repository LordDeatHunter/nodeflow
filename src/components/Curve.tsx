import { createMemo } from "solid-js";
import { nodes } from "../utils/NodeStorage";
import { addPositions, dividePosition } from "../utils/math-utils";

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

  const curve = createMemo(() => {
    const output = nodes[nodeId].outputs[outputId];
    const input = nodes[destinationNodeId].inputs[destinationInputId];

    const start = addPositions(
      nodes[nodeId].position,
      {
        x: output.ref?.offsetLeft ?? 0,
        y: output.ref?.offsetTop ?? 0,
      },
      {
        x: output.ref?.parentElement?.offsetLeft ?? 0,
        y: output.ref?.parentElement?.offsetTop ?? 0,
      },
      dividePosition(
        {
          x: output.ref?.offsetWidth ?? 0,
          y: output.ref?.offsetHeight ?? 0,
        },
        2
      )
    );

    const end = addPositions(
      nodes[destinationNodeId].position,
      {
        x: input.ref?.offsetLeft ?? 0,
        y: input.ref?.offsetTop ?? 0,
      },
      {
        x: input.ref?.parentElement?.offsetLeft ?? 0,
        y: input.ref?.parentElement?.offsetTop ?? 0,
      },
      dividePosition(
        {
          x: input.ref?.offsetWidth ?? 0,
          y: input.ref?.offsetHeight ?? 0,
        },
        2
      )
    );

    const xCurve = 0;
    const yCurve = (end.y - start.y) / 1.5;

    return {
      start,
      end,
      path: `M ${start.x} ${start.y} C ${start.x + xCurve} ${
        start.y + yCurve
      }, ${end.x - xCurve} ${end.y - yCurve}, ${end.x} ${end.y}`,
    };
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
        d={curve()?.path}
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
