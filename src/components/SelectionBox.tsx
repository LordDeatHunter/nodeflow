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
        position: "absolute",
        left: `${startPosition().x}px`,
        top: `${startPosition().y}px`,
        width: `${Math.abs(
          props.nodeflowData.mouseData.selectionBox!.size.x,
        )}px`,
        height: `${Math.abs(
          props.nodeflowData.mouseData.selectionBox!.size.y,
        )}px`,
        "background-color": "rgba(0, 0, 0, 0.1)",
        border: "2px solid rgba(0, 0, 0, 0.3)",
        "border-radius": "4px",
        "pointer-events": "none",
        "z-index": 10,
      }}
    />
  );
};

export default SelectionBox;
