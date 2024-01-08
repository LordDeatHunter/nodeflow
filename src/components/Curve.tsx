import { Component, createMemo } from "solid-js";
import {
  CurveFunctions,
  getConnector,
  globalMousePosition,
  mouseData,
  nodes,
} from "../utils";
import { Optional, PathData } from "../drawflow-types";

interface CurveProps {
  css?: string;
}

const Curve: Component<CurveProps> = (props) => {
  const curveData = createMemo<Optional<PathData>>(() => {
    if (!mouseData.heldNodeId || !mouseData.heldConnectorId) {
      return undefined;
    }
    const {
      position: startPosition,
      offset: startNodeOffset,
      size: startNodeSize,
    } = nodes[mouseData.heldNodeId];
    const output = getConnector(
      mouseData.heldNodeId,
      mouseData.heldConnectorId,
    )!;

    const start = startPosition.add(
      startNodeOffset,
      output.position,
      output.size.divideBy(2),
    );
    const end = globalMousePosition();

    return {
      start,
      end,
      path: CurveFunctions.createDraggingPathCurve(
        start,
        end,
        startPosition.add(startNodeOffset).add(startNodeSize.divideBy(2)),
        end,
      ),
    };
  });

  return (
    <svg
      style={{
        "z-index": 2,
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
