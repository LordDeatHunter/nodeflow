import { NodeflowLib, Optional } from "nodeflow-lib";
import { createMemo, createSignal, Show } from "solid-js";
import NodeDataDisplay from "./NodeDataDisplay";
import NodeFormButtons from "./NodeFormButtons";
import NodeForm from "./NodeForm";
import sidebarCss from "../styles/sidebar.module.scss";
import { FamilyTreeConstants } from "../Constants";

export type FormDataType = CustomNodeflowDataType & { id: string };

const SidebarContent = () => {
  const [formData, setFormData] =
    createSignal<Optional<FormDataType>>(undefined);

  const nodeData = createMemo<Optional<FormDataType>>(() => {
    const nodeflowData = NodeflowLib.get().getNodeflow(
      FamilyTreeConstants.MAIN_NODEFLOW,
    )!;
    const nodeId = nodeflowData.mouseData.heldNodeId;
    if (!nodeId || !nodeflowData.nodes.has(nodeId)) return undefined;

    return {
      ...nodeflowData.nodes.get(nodeId)!.customData,
      id: nodeId,
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
