import { Component, createEffect, createMemo } from "solid-js";
import { CurveFunctions, drawflow, drawflowEventStore } from "../utils";
import { Optional, SelectableElementCSS } from "../drawflow-types";
import NodeConnector from "../utils/data/NodeConnector";
import DrawflowNodeData from "../utils/data/DrawflowNodeData";

interface NodeCurveProps {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
}

const NodeCurve: Component<NodeCurveProps> = (props) => {
  const startNode = createMemo<DrawflowNodeData>(
    () => drawflow.nodes.get(props.sourceNodeId)!,
  );
  const endNode = createMemo<DrawflowNodeData>(
    () => drawflow.nodes.get(props.destinationNodeId)!,
  );

  const sourceConnector = createMemo<Optional<NodeConnector>>(() =>
    startNode().getConnector(props.sourceConnectorId),
  );
  const destinationConnector = createMemo<Optional<NodeConnector>>(() =>
    endNode().getConnector(props.destinationConnectorId),
  );

  const destinationIndex = createMemo<number>(() =>
    !startNode() || !endNode()
      ? -1
      : sourceConnector()?.destinations?.findIndex(
          (destination) =>
            destination.destinationConnector === destinationConnector(),
        ) ?? -1,
  );

  createEffect(() => {
    if (destinationIndex() < 0) {
      return;
    }

    const {
      position: startPosition,
      offset: startNodeOffset,
      size: startNodeSize,
    } = startNode();
    const {
      position: endPosition,
      offset: endNodeOffset,
      size: endNodeSize,
    } = endNode();

    const outputSection = startNode().getSectionFromConnector(
      props.sourceConnectorId,
    )!;
    const inputSection = endNode().getSectionFromConnector(
      props.destinationConnectorId,
    )!;
    const input = inputSection.connectors.get(props.destinationConnectorId)!;
    const output = outputSection.connectors.get(props.sourceConnectorId)!;

    const start = startPosition.add(
      startNodeOffset,
      output.position,
      output.size.divideBy(2),
    );
    const end = endPosition.add(
      endNodeOffset,
      input.position,
      input.size.divideBy(2),
    );

    sourceConnector()!.destinations.get(destinationIndex()).path = {
      start,
      end,
      path: CurveFunctions.createNodePathCurve(
        start,
        end,
        startPosition.add(startNodeOffset).add(startNodeSize.divideBy(2)),
        endPosition.add(endNodeOffset).add(endNodeSize.divideBy(2)),
      ),
    };
  });

  return (
    <path
      onPointerDown={(event) => {
        drawflowEventStore.onPointerDownInNodeCurve.publish({
          event,
          sourceConnector: sourceConnector()!,
          destinationConnector: destinationConnector()!,
        });
      }}
      d={sourceConnector()!.destinations.get(destinationIndex()).path?.path}
      stroke="black"
      stroke-width={1}
      fill="none"
      classList={{
        [props.css?.normal ?? ""]: true,
        [props.css?.selected ?? ""]:
          drawflow.mouseData.heldConnection?.sourceConnector.parentSection
            .parentNode.id === props.sourceNodeId &&
          drawflow.mouseData.heldConnection?.sourceConnector.id ===
            props.sourceConnectorId &&
          drawflow.mouseData.heldConnection?.destinationConnector.parentSection
            .parentNode.id === props.destinationNodeId &&
          drawflow.mouseData.heldConnection?.destinationConnector.id ===
            props.destinationConnectorId,
      }}
      style={{
        cursor: "pointer",
        "pointer-events": "visibleStroke",
      }}
    />
  );
};
export default NodeCurve;
