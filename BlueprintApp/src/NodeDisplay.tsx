import { Component } from "solid-js";
import { DrawflowNode } from "nodeflow/src";

const NodeDisplay: Component<{ node: DrawflowNode }> = (props) => (
  <div style={{ padding: "1rem", "padding-left": "2rem" }}>
    <p>{props.node.position.x.toFixed(2)}</p>
    <p>{props.node.position.y.toFixed(2)}</p>
  </div>
);

export default NodeDisplay;
