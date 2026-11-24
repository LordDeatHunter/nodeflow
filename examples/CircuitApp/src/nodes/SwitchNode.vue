<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { stop, updateCustomData, useCustomData } from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const on = computed(() => !!data.value.on);
</script>

<template>
  <div class="node-body node-body--source">
    <input
      class="node-name"
      :value="data.name ?? ''"
      placeholder="Switch"
      aria-label="Switch name"
      @input="
        updateCustomData(node, {
          name: ($event.target as HTMLInputElement).value,
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    />
    <button
      type="button"
      class="toggle"
      :class="{ 'toggle--on': on }"
      role="switch"
      :aria-checked="on"
      :aria-label="`Turn ${on ? 'off' : 'on'}`"
      @pointerdown="stop"
      @mousedown="stop"
      @click="updateCustomData(node, { on: !on })"
    >
      <span class="toggle-knob" />
    </button>
  </div>
</template>
