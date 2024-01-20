import { Component } from "solid-js";
import { DrawflowNode } from "nodeflow/src";
import nodeCss from "../styles/node.module.scss";

const NodeBody: Component<{ node: DrawflowNode }> = (props) => (
  <p class={nodeCss.nodeFont}>{props.node.customData?.name}</p>
);

export default NodeBody;
