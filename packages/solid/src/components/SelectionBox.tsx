import { NodeflowData } from "@nodeflow/core";
import { createMemo } from "solid-js";

const SelectionBox = (props: {
  nodeflowData: NodeflowData;
  tick: () => number;
}) => {
  const startPosition = createMemo(() => {
    props.tick();
    return props.nodeflowData.mouseData.selectionBox.boundingBox!.startPosition();
  });

  const size = createMemo(() => {
    props.tick();
    return props.nodeflowData.mouseData.selectionBox.boundingBox!.size.abs();
  });

  return (
    <div
      style={{
        left: `${startPosition().x}px`,
        top: `${startPosition().y}px`,
        width: `${size().x}px`,
        height: `${size().y}px`,
      }}
      class="nodeflowSelectionBox"
    />
  );
};

export default SelectionBox;
