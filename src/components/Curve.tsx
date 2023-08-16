import { createEffect, createSignal, on } from "solid-js";
import { ModifiableCurveProps, SignalObject } from "../types/types";
import {
  getInputRect,
  getNode,
  getOutputRect,
  nodes,
} from "../utils/NodeStorage";
import { addPositions } from "../utils/math-utils";
import { drawflowPos, zoomLevel } from "./Drawflow";

const createCurve = (
  startNodeId: string,
  outputId: string,
  endNodeId: string,
  inputId: string
) => {
  const defaultRect = { x: 0, y: 0, width: 0, height: 0 };
  const startRect = getOutputRect(startNodeId, outputId) ?? defaultRect;
  const start = addPositions(startRect, {
    x: startRect.width / 2,
    y: startRect.width / 2,
  });

  const endRect = getInputRect(endNodeId, inputId) ?? defaultRect;
  const end = addPositions(endRect, {
    x: endRect.width / 2,
    y: startRect.width / 2,
  });

  const zoom = zoomLevel();
  start.x /= zoom;
  start.y /= zoom;
  end.x /= zoom;
  end.y /= zoom;

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

interface CurveProps {
  nodeId: string;
  outputId: string;
  destinationNodeId: string;
  destinationInputId: string;
}

const Curve = (props: CurveProps) => {
  const { nodeId, outputId, destinationNodeId, destinationInputId } = props;
  const [curve, setCurve] = createSignal<ReturnType<typeof createCurve>>();

  const curveProps: SignalObject<ModifiableCurveProps> = nodes()
    [nodeId].outputs.get()
    [outputId].get().curveProps!;

  const startNode = getNode(nodeId);
  const endNode = getNode(destinationNodeId);
  if (!startNode || !endNode) return;

  const updateCurve = () => {
    setCurve(
      createCurve(nodeId, outputId, destinationNodeId, destinationInputId)
    );
  };

  createEffect(
    on([startNode.position.get, endNode.position.get, drawflowPos], () =>
      updateCurve()
    )
  );

  return (
    <svg
      style={{
        "z-index": 3,
        position: "absolute",
        width: "100%",
        height: "100%",
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
        stroke={curveProps.get()?.lineColor?.get() ?? "black"}
        stroke-width={curveProps.get()?.strokeWeight?.get() ?? 1}
        fill="transparent"
        marker-end="url(#pointer)"
      />
    </svg>
  );
};
export default Curve;