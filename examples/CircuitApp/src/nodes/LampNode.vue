<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { inputLevel, stop, updateCustomData, useCustomData } from "./common";
import LampSymbol from "../components/parts/LampSymbol.vue";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const on = computed(() => inputLevel(props.node, "input-0"));
</script>

<template>
  <div class="part">
    <div class="part-stage">
      <LampSymbol :on="on" />
    </div>
    <input
      class="node-name part-name part-label"
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
      @touchstart="stop"
      @mousedown="stop"
    />
  </div>
</template>
