import { Component, createMemo } from "solid-js";
import formStyle from "../styles/form.module.scss";
import NodeflowNodeData from "nodeflow-lib/src/utils/data/NodeflowNodeData";

const NodeDataDisplay: Component<{ nodeData: NodeflowNodeData }> = (props) => {
  const connectors = createMemo(() =>
    props.nodeData
      .getAllSourceConnectors()
      .map((connector) => connector.parentNode),
  );
  const mother = createMemo(() =>
    connectors().find((node) => node.customData.gender === "F"),
  );
  const father = createMemo(() =>
    connectors().find((node) => node.customData.gender === "M"),
  );

  return (
    <div class={formStyle.displayContainer}>
      <h2>Selected Node</h2>
      <div class={formStyle.fieldDisplayContainer}>
        <p>Name</p>
        <p>{props.nodeData.customData.name}</p>
      </div>
      <div class={formStyle.fieldDisplayContainer}>
        <p>Gender</p>
        <p
          class={
            formStyle[
              props.nodeData.customData.gender === "F"
                ? "femaleFont"
                : "maleFont"
            ]
          }
        >
          {props.nodeData.customData.gender === "F" ? "Female" : "Male"}
        </p>
      </div>
      <div class={formStyle.parentDisplayContainer}>
        <div class={formStyle.parentDisplay}>
          <p>Mother</p>
          <p
            onClick={() => {
              mother()?.nodeflow.mouseData.clearSelections();
              mother()?.select();
            }}
            classList={{
              [formStyle.validMother]: !!mother(),
              [formStyle.invalidParent]: !mother(),
            }}
          >
            {mother()?.customData.name || "Unknown"}
          </p>
        </div>
        <div class={formStyle.parentDisplay}>
          <p>Father</p>
          <p
            onClick={() => {
              father()?.nodeflow.mouseData.clearSelections();
              father()?.select();
            }}
            classList={{
              [formStyle.validFather]: !!father(),
              [formStyle.invalidParent]: !father(),
            }}
          >
            {father()?.customData.name || "Unknown"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NodeDataDisplay;
