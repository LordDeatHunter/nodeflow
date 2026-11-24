import { Component } from "solid-js";
import { NodeflowNodeData } from "@nodeflow-lib/solid";
import nodeCss from "../styles/node.module.scss";

const NodeBody: Component<{ node: NodeflowNodeData }> = (props) => (
  <>
    <p class={nodeCss.nodeCaption}>
      {props.node.customData?.gender === "F" ? "Female" : "Male"}
    </p>
    <p class={nodeCss.nodeFont}>{props.node.customData?.name}</p>
  </>
);

export default NodeBody;
