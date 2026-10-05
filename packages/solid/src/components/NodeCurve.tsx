import { Component, createMemo, Show } from "solid-js";
import {
  NodeflowData,
  Optional,
  SelectableElementCSS,
  NodeConnector,
  getLineDashArray,
} from "@nodeflow-lib/core";

interface NodeCurveProps {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
  nodeflowData: NodeflowData;
  tick: () => number;
}

interface CurveRenderData {
  path: string;
  dash: string | undefined;
  sourceConnector: NodeConnector;
  destinationConnector: NodeConnector;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  let cachedStartX = NaN,
    cachedStartY = NaN,
    cachedEndX = NaN,
    cachedEndY = NaN;
  let cachedPath: string | undefined;
  let cachedShape: string | undefined;

  const curveData = createMemo<Optional<CurveRenderData>>(() => {
    props.tick();

    const startNode = props.nodeflowData.nodes.get(props.sourceNodeId);
    const endNode = props.nodeflowData.nodes.get(props.destinationNodeId);
    if (!startNode || !endNode) return undefined;

    const sourceConn = startNode.getConnector(props.sourceConnectorId);
    const destConn = endNode.getConnector(props.destinationConnectorId);
    if (!sourceConn || !destConn) return undefined;

    const destIndex = sourceConn.destinations.findIndex(
      (d) => d.destinationConnector === destConn,
    );
    if (destIndex < 0) return undefined;

    const dest = sourceConn.destinations.get(destIndex);

    const start = sourceConn.getCenter();
    const end = destConn.getCenter();
    const shape =
      dest?.shape ?? props.nodeflowData.settings.defaultLineShape;
    const dash = dest?.dash ?? props.nodeflowData.settings.defaultLineDash;

    let path: string;
    if (
      start.x === cachedStartX &&
      start.y === cachedStartY &&
      end.x === cachedEndX &&
      end.y === cachedEndY &&
      cachedShape === shape &&
      cachedPath
    ) {
      path = cachedPath;
    } else {
      cachedStartX = start.x;
      cachedStartY = start.y;
      cachedEndX = end.x;
      cachedEndY = end.y;
      cachedShape = shape;

      const { curveFunctions } = props.nodeflowData;
      const { anchorStart, anchorEnd, path: newPath } =
        curveFunctions.createPathForShape(
          shape,
          start,
          end,
          startNode.getCenter(),
          endNode.getCenter(),
        );

      if (dest) {
        dest.path = { start, end, anchorStart, anchorEnd, path: newPath };
      }

      path = newPath;
      cachedPath = path;
    }

    return {
      path,
      dash: getLineDashArray(dash),
      sourceConnector: sourceConn,
      destinationConnector: destConn,
    };
  });

  const isSelected = createMemo(() => {
    props.tick();
    return props.nodeflowData.mouseData.hasSelectedConnection(
      props.sourceNodeId,
      props.sourceConnectorId,
      props.destinationNodeId,
      props.destinationConnectorId,
    );
  });

  return (
    <>
      <path
        onPointerDown={(event) => {
          const data = curveData();
          if (!data) return;
          props.nodeflowData.eventStore.onPointerDownInNodeCurve.publish({
            event,
            sourceConnector: data.sourceConnector,
            destinationConnector: data.destinationConnector,
          });
        }}
        d={curveData()?.path}
        stroke="black"
        stroke-width={1}
        stroke-dasharray={curveData()?.dash}
        fill="none"
        classList={{
          [props.css?.normal ?? ""]: true,
          [props.css?.selected ?? ""]: isSelected(),
        }}
        style={{
          cursor: "pointer",
          "pointer-events": "visibleStroke",
        }}
      />
      <Show when={props.nodeflowData.settings.debugMode}>
        {(() => {
          const debugData = createMemo(() => {
            props.tick();
            const startNode = props.nodeflowData.nodes.get(props.sourceNodeId);
            if (!startNode) return undefined;
            const sourceConn = startNode.getConnector(props.sourceConnectorId);
            if (!sourceConn) return undefined;
            const endNode = props.nodeflowData.nodes.get(
              props.destinationNodeId,
            );
            if (!endNode) return undefined;
            const destConn = endNode.getConnector(props.destinationConnectorId);
            if (!destConn) return undefined;
            const destIndex = sourceConn.destinations.findIndex(
              (d) => d.destinationConnector === destConn,
            );
            return sourceConn.destinations.get(destIndex);
          });
          return (
            <>
              <circle
                cx={debugData()?.path?.anchorStart?.x}
                cy={debugData()?.path?.anchorStart?.y}
                r={4}
                fill="none"
                class={props.css?.normal ?? ""}
              />
              <circle
                cx={debugData()?.path?.anchorEnd?.x}
                cy={debugData()?.path?.anchorEnd?.y}
                r={4}
                fill="none"
                class={props.css?.normal ?? ""}
              />
            </>
          );
        })()}
      </Show>
    </>
  );
};
export default NodeCurve;
