import { NodeflowData } from "../utils";
import { createMemo } from "solid-js";

const SelectionBox = (props: { nodeflowData: NodeflowData }) => {
  const startPosition = createMemo(() =>
    props.nodeflowData.mouseData.selectionBox!.startPosition(),
  );

  const size = createMemo(() =>
    props.nodeflowData.mouseData.selectionBox!.size.abs(),
  );

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
