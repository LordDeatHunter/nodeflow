import { NodeflowNodeData, type DisplayFunc } from "nodeflow-lib";
import nodeCss from "../styles/node.module.scss";

// return a "p" html element
const NodeBody: DisplayFunc = (props: { node: NodeflowNodeData }) => {
  const p = document.createElement("p");
  p.classList.add(nodeCss.nodeFont);
  p.innerHTML = props.node.customData?.name;

  props.node.nodeflow.eventStore.onNodeCustomDataChanged.subscribe(
    `nodeflow-node-${props.node.id}-data-changed`,
    ({ nodeId, customData }) => {
      if (nodeId !== props.node.id) return;
      p.innerHTML = customData?.name;
    },
  );

  return p;
};

export default NodeBody;
