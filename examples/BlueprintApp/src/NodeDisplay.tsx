import { Component } from "solid-js";
import { NodeflowNodeData } from "nodeflow-lib";

const NodeDisplay: Component<{ node: NodeflowNodeData }> = (props) => (
  <div style={{ padding: "1rem", "padding-left": "2rem" }}>
    <p>{props.node.position.x.toFixed(2)}</p>
    <p>{props.node.position.y.toFixed(2)}</p>
  </div>
);

export default NodeDisplay;
