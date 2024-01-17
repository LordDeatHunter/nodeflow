import { mouseData, nodes, Optional } from "nodeflow/src";
import { createMemo, createSignal, Show } from "solid-js";
import NodeDataDisplay from "./NodeDataDisplay";
import NodeFormButtons from "./NodeFormButtons";
import NodeForm from "./NodeForm";
import sidebarCss from "../styles/sidebar.module.scss";

export type FormDataType = Nodeflow.CustomDataType & { id: string };

const SidebarContent = () => {
  const [formData, setFormData] =
    createSignal<Optional<FormDataType>>(undefined);

  const nodeData = createMemo<Optional<FormDataType>>(() => {
    if (!mouseData.heldNodeId) return undefined;
    return {
      ...nodes[mouseData.heldNodeId!].customData,
      id: mouseData.heldNodeId!,
    };
  });

  const showForm = createMemo(
    () => formData() !== undefined || nodeData() !== undefined,
  );

  const formMode = createMemo(() => {
    if (!showForm()) return "empty";
    const data = formData();
    if (data !== undefined) {
      return data.id ? "edit" : "add";
    }
    return "view";
  });

  return (
    <div class={sidebarCss.sidebarContent}>
      <h1>Family Tree</h1>
      <Show when={showForm()} fallback={<h2>No Node Selected</h2>}>
        <Show
          when={formData() !== undefined}
          fallback={<NodeDataDisplay nodeData={nodeData()!} />}
        >
          <NodeForm
            formData={formData()!}
            updateFormData={(data) => setFormData({ ...formData()!, ...data })}
          />
        </Show>
      </Show>
      <NodeFormButtons
        mode={formMode()}
        setFormData={setFormData}
        nodeData={nodeData()}
        formData={formData()}
      />
    </div>
  );
};

export default SidebarContent;
