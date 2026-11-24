import {
  Component,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { NodeflowData, NodeflowNodeData } from "@nodeflow-lib/solid";
import { createDerivedNode, groupNodes } from "./utils";
import appCss from "./styles/app.module.scss";

const SUBSCRIPTION = "blueprint:selection-toolbar";

const sameIds = (prev: Array<string>, next: Array<string>) =>
  prev.length === next.length && prev.every((id, i) => id === next[i]);

/**
 * Actions for the nodes selected on `nodeflow`: turn them into a derived
 * node, group them, or ungroup them. Shows `fallback` while nothing is
 * selected.
 */
const SelectionToolbar: Component<{
  nodeflow: NodeflowData;
  /** Which selected nodes the actions apply to; all of them by default. */
  include?: (node: NodeflowNodeData) => boolean;
  class?: string;
  fallback?: JSX.Element;
}> = (props) => {
  const [selectedIds, setSelectedIds] = createSignal<Array<string>>([], {
    equals: sameIds,
  });

  onMount(() => {
    const update = () =>
      setSelectedIds(
        (props.nodeflow.mouseData.heldNodes as Array<NodeflowNodeData>)
          .filter((node) => props.include?.(node) ?? true)
          .map((node) => node.id),
      );
    update();
    props.nodeflow.eventStore.onContentChanged.subscribe(SUBSCRIPTION, update);
    onCleanup(() =>
      props.nodeflow.eventStore.onContentChanged.unsubscribe(SUBSCRIPTION),
    );
  });

  // The group every selected node is in, if they all share one.
  const selectedGroupId = createMemo(() => {
    const ids = selectedIds();
    const groupIds = new Set(
      ids.map((id) => props.nodeflow.getGroupOfNode(id)?.id),
    );
    const [groupId] = groupIds;
    return ids.length > 0 && groupIds.size === 1 ? groupId : undefined;
  });

  return (
    <Show when={selectedIds().length > 0} fallback={props.fallback}>
      <div class={props.class ?? appCss.selectionToolbar}>
        <span class={appCss.selectionCount}>
          {selectedIds().length} selected
        </span>
        <button
          type="button"
          class={appCss.toolbarButton}
          onClick={() => createDerivedNode(selectedIds(), props.nodeflow)}
        >
          Create derived node
        </button>
        <Show
          when={selectedGroupId()}
          fallback={
            <button
              type="button"
              class={appCss.toolbarButton}
              onClick={() => groupNodes(selectedIds(), props.nodeflow)}
            >
              Group
            </button>
          }
        >
          {(groupId) => (
            <button
              type="button"
              class={appCss.toolbarButton}
              onClick={() => props.nodeflow.removeGroup(groupId())}
            >
              Ungroup
            </button>
          )}
        </Show>
      </div>
    </Show>
  );
};

export default SelectionToolbar;
