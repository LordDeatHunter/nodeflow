<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { NodeflowData, NodeflowNodeData } from "@nodeflow-lib/vue";
import { createChip, groupNodes } from "../circuit";

/**
 * Actions for the nodes selected on `nodeflow`: turn them into a chip, group
 * them, or ungroup them. Shows the `fallback` slot while nothing is selected.
 */
const props = defineProps<{
  nodeflow: NodeflowData;
  /** Which selected nodes the actions apply to; all of them by default. */
  include?: (node: NodeflowNodeData) => boolean;
  toolbarClass?: string;
}>();

const SUBSCRIPTION = "circuit:selection-toolbar";
const selectedIds = ref<Array<string>>([]);
/** The group every selected node is in, if they all share one. */
const selectedGroupId = ref<string>();

const update = () => {
  const next = props.nodeflow.mouseData.heldNodes
    .filter((node) => props.include?.(node) ?? true)
    .map((node) => node.id);
  const prev = selectedIds.value;
  const same =
    prev.length === next.length && prev.every((id, i) => id === next[i]);
  if (!same) selectedIds.value = next;

  // Grouping changes without the selection changing, so check it each time.
  const groupIds = new Set(
    next.map((id) => props.nodeflow.getGroupOfNode(id)?.id),
  );
  const [groupId] = groupIds;
  selectedGroupId.value =
    next.length > 0 && groupIds.size === 1 ? groupId : undefined;
};

onMounted(() => {
  update();
  props.nodeflow.eventStore.onContentChanged.subscribe(SUBSCRIPTION, update);
});
onBeforeUnmount(() =>
  props.nodeflow.eventStore.onContentChanged.unsubscribe(SUBSCRIPTION),
);
</script>

<template>
  <div v-if="selectedIds.length > 0" :class="toolbarClass ?? 'selection-toolbar'">
    <span class="selection-count">{{ selectedIds.length }} selected</span>
    <button
      type="button"
      class="toolbar-button"
      @click="createChip(selectedIds, nodeflow)"
    >
      Make chip
    </button>
    <button
      v-if="selectedGroupId"
      type="button"
      class="toolbar-button"
      @click="nodeflow.removeGroup(selectedGroupId)"
    >
      Ungroup
    </button>
    <button
      v-else
      type="button"
      class="toolbar-button"
      @click="groupNodes(selectedIds, nodeflow)"
    >
      Group
    </button>
  </div>
  <slot v-else name="fallback" />
</template>
