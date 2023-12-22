import { mouseData, nodes } from "solid-drawflow/src";
import { Show } from "solid-js";
import NodeForm from "./NodeForm";

const SelectedNodePreview = () => (
  <>
    <h1>Family Tree</h1>
    <Show when={!!mouseData.heldNodeId} fallback={<h2>No Node Selected</h2>}>
      <NodeForm selectedNode={nodes[mouseData.heldNodeId!]} />
    </Show>
  </>
);

export default SelectedNodePreview;
