import { Component } from "solid-js";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";

const NodeDataDisplay: Component<{ nodeData: FormDataType }> = (props) => (
  <div class={formStyle.displayContainer}>
    <h2>Selected Node</h2>
    <div class={formStyle.fieldDisplayContainer}>
      <p>Name</p>
      <p>{props.nodeData.name}</p>
    </div>
    <div class={formStyle.fieldDisplayContainer}>
      <p>Gender</p>
      <p
        class={
          formStyle[props.nodeData.gender === "F" ? "femaleFont" : "maleFont"]
        }
      >
        {props.nodeData.gender === "F" ? "Female" : "Male"}
      </p>
    </div>
  </div>
);

export default NodeDataDisplay;
