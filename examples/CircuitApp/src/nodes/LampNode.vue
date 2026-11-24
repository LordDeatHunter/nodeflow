<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { inputLevel, stop, updateCustomData, useCustomData } from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const on = computed(() => inputLevel(props.node, "input-0"));
</script>

<template>
  <div class="node-body node-body--sink">
    <span
      class="lamp"
      :class="{ 'lamp--on': on }"
      role="img"
      :aria-label="on ? 'Lamp on' : 'Lamp off'"
    />
    <input
      class="node-name"
      :value="data.name ?? ''"
      placeholder="Lamp"
      aria-label="Lamp name"
      @input="
        updateCustomData(node, {
          name: ($event.target as HTMLInputElement).value,
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    />
  </div>
</template>
