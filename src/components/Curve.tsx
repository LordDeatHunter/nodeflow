import { Component, createMemo, Show } from "solid-js";
import { NodeflowData } from "../utils";
import { Optional, PathData } from "../nodeflow-types";

interface CurveProps {
  css?: string;
  nodeflowData: NodeflowData;
}

const Curve: Component<CurveProps> = (props) => {
  const curveData = createMemo<Optional<PathData>>(() => {
    const { mouseData, curveFunctions } = props.nodeflowData;

    if (mouseData.heldConnectors.length !== 1) return undefined;

    const output = mouseData.heldConnectors[0];
    const node = output.parentNode;

    const start = output.getCenter();
    const end = mouseData.globalMousePosition();

    const { anchorStart, anchorEnd } = curveFunctions.calculateCurveAnchors(
      start,
      end,
      node.getCenter(),
      end,
    );

    return {
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
      <Show when={props.nodeflowData.settings.debugMode}>
        <circle
          cx={curveData()?.anchorStart.x}
          cy={curveData()?.anchorStart.y}
          r={4}
          fill="none"
          class={props.css ?? ""}
        />
        <circle
          cx={curveData()?.anchorEnd.x}
          cy={curveData()?.anchorEnd.y}
          r={4}
          fill="none"
          class={props.css ?? ""}
        />
      </Show>
    </svg>
  );
};
export default Curve;
