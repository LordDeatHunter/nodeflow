<script setup lang="ts">
import { computed } from "vue";
import { PART_HEIGHT, PART_WIDTH } from "./geometry";

/** A scope window tracing the clock's level over its last frames. */
const props = defineProps<{ trace: Array<boolean> }>();

const LEFT = 20;
const RIGHT = 96;
const HIGH = 30;
const LOW = 64;

const path = computed(() => {
  const step = (RIGHT - LEFT) / Math.max(props.trace.length, 1);
  const y = (level: boolean) => (level ? HIGH : LOW);
  return props.trace.reduce(
    (d, level, i) => `${d} V${y(level)} H${LEFT + step * (i + 1)}`,
    `M${LEFT} ${y(props.trace[0] ?? false)}`,
  );
});
const high = computed(() => props.trace.at(-1) ?? false);
</script>

<template>
  <svg
    class="part-symbol"
    :viewBox="`0 0 ${PART_WIDTH} ${PART_HEIGHT}`"
    aria-hidden="true"
  >
    <line class="pin" :class="{ 'pin--on': high }" x1="104" y1="48" :x2="PART_WIDTH" y2="48" />
    <rect class="scope" x="12" y="20" width="92" height="56" rx="7" />
    <line class="scope-grid" x1="12" y1="48" x2="104" y2="48" />
    <path class="clock-trace" :class="{ 'clock-trace--on': high }" :d="path" />
  </svg>
</template>
