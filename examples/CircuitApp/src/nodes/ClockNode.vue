<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { outputLevel, stop, updateCustomData, useCustomData } from "./common";
import { CLOCK_PERIODS, clockPeriod } from "../simulation";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const high = computed(() => !!outputLevel(props.node, "output-0"));
</script>

<template>
  <div class="node-body node-body--source">
    <span class="node-label">
      Clock
      <span class="led" :class="{ 'led--on': high }" aria-hidden="true" />
    </span>
    <select
      class="node-control"
      :value="clockPeriod(data.period)"
      aria-label="Clock period in frames"
      @change="
        updateCustomData(node, {
          period: Number(($event.target as HTMLSelectElement).value),
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    >
      <option v-for="period in CLOCK_PERIODS" :key="period" :value="period">
        {{ period }} frames
      </option>
    </select>
  </div>
</template>
