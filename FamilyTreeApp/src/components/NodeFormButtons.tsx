import { Component, Show } from "solid-js";
import { drawflow, Optional } from "solid-drawflow/src";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";
import { cleanInput, createFamilyMemberNode } from "../utils";

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
  const onEdit = () => props.setFormData({ ...props.nodeData! });
  const onRemoveEditingNode = () => {
    drawflow.removeNode(props.formData!.id);
    props.setFormData(undefined);
  };
  const onRemovePreviewNode = () => drawflow.removeNode(props.nodeData!.id);
  const onSaveNewNode = () => {
    if (!props.formData?.name || !props.formData?.gender) return;
    const node = createFamilyMemberNode(
      cleanInput(props.formData!.name),
      props.formData!.gender,
      drawflow.center(),
    );
    drawflow.mouseData.selectNode(
      node!.id,
      drawflow.mouseData.mousePosition!,
      false,
    );
    props.setFormData(undefined);
  };
  const onUpdateNode = () => {
    drawflow.updateNode(props.formData!.id, {
      customData: {
        ...props.formData,
        name: cleanInput(props.formData!.name),
      },
    });
    props.setFormData(undefined);
  };

  return (
    <div class={formStyle.formButtonContainer}>
      <Show when={props.mode === "empty"}>
        <AddButton onClick={onAdd} />
      </Show>
      <Show when={props.mode === "add"}>
        <button onClick={onSaveNewNode}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </Show>
      <Show when={props.mode === "view"}>
        <AddButton onClick={onAdd} />
        <button onClick={onEdit}>Edit</button>
        <button onClick={onRemovePreviewNode}>Delete</button>
      </Show>
      <Show when={props.mode === "edit"}>
        <button onClick={onUpdateNode}>Save</button>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onRemoveEditingNode}>Delete</button>
      </Show>
    </div>
  );
};

export default NodeFormButtons;
