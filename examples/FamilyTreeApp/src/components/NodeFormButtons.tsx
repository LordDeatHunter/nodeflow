import { Component, Show } from "solid-js";
import { Optional } from "nodeflow-lib";
import { FormDataType } from "./SidebarContent";
import formStyle from "../styles/form.module.scss";
import { cleanInput, createFamilyMemberNode } from "../utils";
import nodeCss from "../styles/node.module.scss";
import { nodeflowData } from "../App";

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
    nodeflowData.removeNode(props.formData!.id);
    props.setFormData(undefined);
  };
  const onRemovePreviewNode = () => nodeflowData.removeNode(props.nodeData!.id);
  const onSaveNewNode = () => {
    if (!props.formData?.name || !props.formData?.gender) return;
    const node = createFamilyMemberNode(
      cleanInput(props.formData!.name),
      props.formData!.gender,
      nodeflowData.center(),
    );

    nodeflowData.mouseData.clearSelections();
    node.select(node.getCenter());

    props.setFormData(undefined);
  };
  const onUpdateNode = () => {
    const nodeId = props.formData!.id;
    const node = nodeflowData.nodes.get(nodeId);

    if (node === undefined) {
      props.setFormData(undefined);
      return;
    }

    const currentData = node.customData;

    const filteredData = Object.fromEntries(
      Object.entries(props.formData!)
        .map(([key, value]) => [
          key,
          typeof value === "string" ? cleanInput(value) : value,
        ])
        .filter(
          ([key, value]) =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            key !== "id" && !!value && value !== currentData[key],
        ),
    );

    if (Object.keys(filteredData).length === 0) {
      props.setFormData(undefined);
      return;
    }

    const newData = {
      customData: { ...currentData, ...filteredData },
    };

    if ("gender" in filteredData) {
      Object.assign(newData, {
        css: {
          normal:
            filteredData.gender === "M" ? nodeCss.maleNode : nodeCss.femaleNode,
          selected:
            filteredData.gender === "M"
              ? nodeCss.selectedMaleNode
              : nodeCss.selectedFemaleNode,
        },
      });
    }

    nodeflowData.updateNode(nodeId, newData);
    props.setFormData(undefined);

    if ("gender" in filteredData) {
      node.getConnector("O")!.css =
        filteredData.gender === "M"
          ? nodeCss.maleOutputConnector
          : nodeCss.femaleOutputConnector;

      // TODO: maybe create new connections to the respective connectors of the new gender? Eg. mother->father, father->mother
      nodeflowData.removeOutgoingConnections(nodeId);
    }
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
