import { NodeflowData } from "../utils";

const SelectionBox = (props: { nodeflowData: NodeflowData }) => {
  // TODO: REACTIVITY
  const startPosition =
    props.nodeflowData.mouseData.selectionBox.boundingBox?.startPosition();
  const size =
    props.nodeflowData.mouseData.selectionBox.boundingBox?.size.abs();

  if (!startPosition || !size) {
    return null;
  }

  const div = document.createElement("div");
  div.className = "nodeflowSelectionBox";
  div.style.left = `${startPosition.x}px`;
  div.style.top = `${startPosition.y}px`;
  div.style.width = `${size.x}px`;
  div.style.height = `${size.y}px`;

  return div;
};

export default SelectionBox;
