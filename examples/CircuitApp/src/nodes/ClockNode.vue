<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { outputLevel, stop, updateCustomData, useCustomData } from "./common";

const PERIODS = [250, 500, 1000, 2000];

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const high = computed(() => !!outputLevel(props.node, "output-0"));

const label = (period: number) =>
  period < 1000 ? `${period} ms` : `${period / 1000} s`;
</script>

<template>
  <div class="node-body node-body--source">
    <span class="node-label">
      Clock
      <span class="led" :class="{ 'led--on': high }" aria-hidden="true" />
    </span>
    <select
      class="node-control"
      :value="data.period ?? 1000"
      aria-label="Clock period"
      @change="
        updateCustomData(node, {
          period: Number(($event.target as HTMLSelectElement).value),
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    >
      <option v-for="period in PERIODS" :key="period" :value="period">
        {{ label(period) }}
      </option>
    </select>
  </div>
</template>
