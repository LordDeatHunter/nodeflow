import { NodeflowNodeData } from "nodeflow-lib";

const NodeDisplay = (props: { node: NodeflowNodeData }) => {
  const nodeDiv = document.createElement("div");

  nodeDiv.style.padding = "1rem";
  nodeDiv.style.paddingLeft = "2rem";

  const x = document.createElement("p");
  x.innerText = props.node.position.x.toFixed(2);

  const y = document.createElement("p");
  y.innerText = props.node.position.y.toFixed(2);

  nodeDiv.appendChild(x);
  nodeDiv.appendChild(y);

  props.node.nodeflow.eventStore.onNodeMoved.subscribe(
    `nodeflow-node-${props.node.id}-display`,
    ({ nodeId, position }) => {
      if (nodeId !== props.node.id) {
        return;
      }

      x.innerText = position.x.toFixed(2);
      y.innerText = position.y.toFixed(2);
    },
  );

  return nodeDiv;
};

export default NodeDisplay;
