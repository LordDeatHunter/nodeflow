import { NodeflowData, Vec2 } from "@nodeflow-lib/core";
import { createMemo, createSignal } from "solid-js";

const SelectionBox = (props: {
  nodeflowData: NodeflowData;
  tick: () => number;
}) => {
  const [element, setElement] = createSignal<HTMLDivElement>();

  // The box is kept in client coordinates; place it inside the canvas, which
  // need not sit at the viewport origin (e.g. below a page header).
  const startPosition = createMemo(() => {
    props.tick();
    const start =
      props.nodeflowData.mouseData.selectionBox.boundingBox!.startPosition();
    const canvas = element()?.parentElement;
    if (!canvas) return start;

    const rect = canvas.getBoundingClientRect();
    return start.subtract(
      Vec2.of(rect.left + canvas.clientLeft, rect.top + canvas.clientTop),
    );
  });

  const size = createMemo(() => {
    props.tick();
    return props.nodeflowData.mouseData.selectionBox.boundingBox!.size.abs();
  });

  return (
    <div
      ref={setElement}
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
