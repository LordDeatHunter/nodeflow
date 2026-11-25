<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { outputLevel, stop, updateCustomData, useCustomData } from "./common";
import { CLOCK_PERIODS, clockPeriod, frameCount } from "../simulation";
import ClockSymbol from "../components/parts/ClockSymbol.vue";

/** How many past frames the trace shows. */
const TRACE_FRAMES = 12;

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const high = computed(() => !!outputLevel(props.node, "output-0"));

// The level at the end of each past frame; the live level is drawn last.
const history = ref<Array<boolean>>(Array(TRACE_FRAMES - 1).fill(false));
watch(frameCount, () => {
  history.value = [...history.value.slice(1), high.value];
});
const trace = computed(() => [...history.value, high.value]);
</script>

<template>
  <div class="part">
    <div class="part-stage">
      <ClockSymbol :trace="trace" />
    </div>
    <select
      class="part-picker part-picker--clock part-label"
      :value="clockPeriod(data.period)"
      aria-label="Clock period in frames"
      @change="
        updateCustomData(node, {
          period: Number(($event.target as HTMLSelectElement).value),
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @touchstart="stop"
      @mousedown="stop"
    >
      <option v-for="period in CLOCK_PERIODS" :key="period" :value="period">
        {{ period }} frames
      </option>
    </select>
  </div>
</template>
