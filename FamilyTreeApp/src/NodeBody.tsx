import { Component } from "solid-js";

const NodeBody: Component<{ nodeId: string }> = (props) => (
  <h1>Node {props.nodeId}</h1>
);

export default NodeBody;
