import { Component, Show } from "solid-js";
import { NodeflowLib, Optional } from "nodeflow-lib";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";
import { cleanInput, createFamilyMemberNode } from "../utils";
import { FamilyTreeConstants } from "../Constants";

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
  const nodeflowData = NodeflowLib.get().getNodeflow(
    FamilyTreeConstants.MAIN_NODEFLOW,
  )!;

  const onAdd = () => props.setFormData({ name: "" } as FormDataType);
  const onCancel = () => props.setFormData(undefined);
  const onEdit = () => props.setFormData({ ...props.nodeData! });
  const onRemoveEditingNode = () => {
    nodeflowData.removeNode(props.formData!.id);
    props.setFormData(undefined);
  };
  const onRemovePreviewNode = () => nodeflowData.removeNode(props.nodeData!.id);
  const onSaveNewNode = () => {
    if (!props.formData?.name || !props.formData?.gender) return;
    const node = createFamilyMemberNode(
      nodeflowData,
      cleanInput(props.formData!.name),
      props.formData!.gender,
      nodeflowData.center(),
    );
    nodeflowData.mouseData.selectNode(
      node!.id,
      nodeflowData.mouseData.mousePosition!,
      false,
    );
    props.setFormData(undefined);
  };
  const onUpdateNode = () => {
    nodeflowData.updateNode(props.formData!.id, {
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
