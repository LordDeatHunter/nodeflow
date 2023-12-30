import { Component } from "solid-js";
import { DrawflowNode } from "solid-drawflow/src";

const NodeBody: Component<{ node: DrawflowNode }> = (props) => (
  <h1>{props.node.customData?.name}</h1>
);

export default NodeBody;
