import { Component, Show } from "solid-js";
import {
  getDrawflowCenter,
  Optional,
  removeNode,
  updateNode,
} from "solid-drawflow/src";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";
import { createFamilyMemberNode } from "../utils";

interface NodeFormButtonsProps {
  mode: "add" | "empty" | "view" | "edit";
  nodeData: Optional<FormDataType>;
  formData: Optional<FormDataType>;
  setFormData: (data: Optional<FormDataType>) => void;
}

const NodeFormButtons: Component<NodeFormButtonsProps> = (props) => {
  const onAdd = () => props.setFormData({ name: "" } as FormDataType);
  const onCancel = () => props.setFormData(undefined);
  const onRemove = () => {
    removeNode(props.formData!.id);
    props.setFormData(undefined);
  };

  return (
    <div class={formStyle.formButtonContainer}>
      <Show when={props.mode === "empty"}>
        <button class={formStyle.formButton} onClick={onAdd}>
          Add
        </button>
      </Show>
      <Show when={props.mode === "add"}>
        <button
          class={formStyle.formButton}
          onClick={() => {
            if (!props.formData?.name || !props.formData?.gender) return;
            createFamilyMemberNode(
              props.formData!.name,
              props.formData!.gender,
              getDrawflowCenter(),
            );
            props.setFormData(undefined);
          }}
        >
          Save
        </button>
        <button class={formStyle.formButton} onClick={onCancel}>
          Cancel
        </button>
      </Show>
      <Show when={props.mode === "view"}>
        <button class={formStyle.formButton} onClick={onAdd}>
          Add
        </button>
        <button
          class={formStyle.formButton}
          onClick={() => props.setFormData({ ...props.nodeData! })}
        >
          Edit
        </button>
        <button
          class={formStyle.formButton}
          onClick={() => removeNode(props.nodeData!.id)}
        >
          Delete
        </button>
      </Show>
      <Show when={props.mode === "edit"}>
        <button
          class={formStyle.formButton}
          onClick={() => {
            updateNode(props.formData!.id, {
              customData: {
                ...props.formData,
              },
            });
            props.setFormData(undefined);
          }}
        >
          Save
        </button>
        <button class={formStyle.formButton} onClick={onCancel}>
          Cancel
        </button>
        <button class={formStyle.formButton} onClick={onRemove}>
          Delete
        </button>
      </Show>
    </div>
  );
};

export default NodeFormButtons;
