import { NodeflowData, Vec2 } from "../utils";
import { createMemo } from "solid-js";

const SelectionBox = (props: { nodeflowData: NodeflowData }) => {
  const startPosition = createMemo(() =>
    Vec2.of(
      Math.min(
        props.nodeflowData.mouseData.selectionBox!.position!.x,
        props.nodeflowData.mouseData.selectionBox!.position!.x +
          props.nodeflowData.mouseData.selectionBox!.size.x,
      ),
      Math.min(
        props.nodeflowData.mouseData.selectionBox!.position!.y,
        props.nodeflowData.mouseData.selectionBox!.position!.y +
          props.nodeflowData.mouseData.selectionBox!.size.y,
      ),
    ),
  );

  return (
    <div
      style={{
        left: `${startPosition().x}px`,
        top: `${startPosition().y}px`,
        width: `${Math.abs(
          props.nodeflowData.mouseData.selectionBox!.size.x,
        )}px`,
        height: `${Math.abs(
          props.nodeflowData.mouseData.selectionBox!.size.y,
        )}px`,
      }}
      class="nodeflowSelectionBox"
    />
  );
};

export default SelectionBox;
