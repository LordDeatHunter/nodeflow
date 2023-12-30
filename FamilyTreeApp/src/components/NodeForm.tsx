import { Component, Show } from "solid-js";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";

const NodeForm: Component<{
  formData: FormDataType;
  updateFormData: (data: Partial<FormDataType>) => void;
}> = (props) => (
  <>
    <Show when={props.formData.id} fallback={<h2>Create Node</h2>}>
      <h2>Update Node</h2>
      <p class={formStyle.displayText}>Id: {props.formData.id}</p>
    </Show>
    <input
      type="text"
      name="lname"
      placeholder="Name"
      value={props.formData.name}
      onInput={(e) => props.updateFormData({ name: e.target.value })}
    />
    <div class={formStyle.horizontalRadioContainer}>
      <input
        type="radio"
        id="male"
        name="gender"
        value="M"
        checked={props.formData.gender === "M"}
        onChange={() => props.updateFormData({ gender: "M" })}
      />
      <p class={formStyle.inputText}>Male</p>
    </div>
    <div class={formStyle.horizontalRadioContainer}>
      <input
        type="radio"
        id="female"
        name="gender"
        value="F"
        checked={props.formData.gender === "F"}
        style={{ margin: 0 }}
        onChange={() => props.updateFormData({ gender: "F" })}
      />
      <p class={formStyle.inputText}>Female</p>
    </div>
  </>
);

export default NodeForm;
