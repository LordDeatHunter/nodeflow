import { Component } from "solid-js";
import { DrawflowNodeData } from "nodeflow-lib";
import nodeCss from "../styles/node.module.scss";

const NodeBody: Component<{ node: DrawflowNodeData }> = (props) => (
  <p class={nodeCss.nodeFont}>{props.node.customData?.name}</p>
);

export default NodeBody;
