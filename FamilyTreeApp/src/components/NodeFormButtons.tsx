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

const AddButton: Component<{ onClick: () => void }> = (props) => (
  <button onClick={() => props.onClick()}>Add</button>
);

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
        <AddButton onClick={onAdd} />
      </Show>
      <Show when={props.mode === "add"}>
        <button
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
        <button onClick={onCancel}>Cancel</button>
      </Show>
      <Show when={props.mode === "view"}>
        <AddButton onClick={onAdd} />
        <button onClick={() => props.setFormData({ ...props.nodeData! })}>
          Edit
        </button>
        <button onClick={() => removeNode(props.nodeData!.id)}>Delete</button>
      </Show>
      <Show when={props.mode === "edit"}>
        <button
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
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onRemove}>Delete</button>
      </Show>
    </div>
  );
};

export default NodeFormButtons;
