import { Component, createMemo } from "solid-js";
import {
  globalMousePosition,
  mouseData,
  nodes,
} from "../utils/drawflow-storage";
import {
  addPositions,
  convertSizeToPosition,
  dividePosition,
} from "../utils/math-utils";
import { PathData } from "../types/types";
import { CurveFunctions } from "../utils/curve-functions";

interface CurveProps {
  css?: string;
}

const Curve: Component<CurveProps> = (props) => {
  const curveData = createMemo<PathData | undefined>(() => {
    if (!mouseData.heldNodeId || !mouseData.heldOutputId) {
      return undefined;
    }
    const { position: startPosition, offset: startNodeOffset } =
      nodes[mouseData.heldNodeId];
    const output = nodes[mouseData.heldNodeId].outputs[mouseData.heldOutputId];

    const start = addPositions(
      startPosition,
      startNodeOffset,
      output.position,
      dividePosition(convertSizeToPosition(output.size), 2),
    );
    const end = globalMousePosition();

    return {
      start,
      end,
      path: CurveFunctions.createDraggingPathCurve(start, end),
    };
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
      <path
        d={curveData()?.path}
        stroke="black"
        stroke-width={1}
        fill="transparent"
        class={props.css}
      />
    </svg>
  );
};
export default Curve;
