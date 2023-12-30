import { Component } from "solid-js";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";

const NodeDataDisplay: Component<{ nodeData: FormDataType }> = (props) => (
  <>
    <h2>Selected Node</h2>
    <p class={formStyle.displayText}>Id: {props.nodeData.id}</p>
    <p class={formStyle.displayText}>Name: {props.nodeData.name}</p>
    <p class={formStyle.displayText}>Gender: {props.nodeData.gender}</p>
  </>
);

export default NodeDataDisplay;
