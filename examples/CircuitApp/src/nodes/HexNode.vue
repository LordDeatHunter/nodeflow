<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { inputLevel } from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();

/** Inputs top to bottom are the 1, 2, 4 and 8 bits. */
const BITS = [0, 1, 2, 3];

const value = computed(() =>
  BITS.reduce(
    (total, bit) =>
      inputLevel(props.node, `input-${bit}`) ? total + (1 << bit) : total,
    0,
  ),
);
</script>

<template>
  <div class="node-body node-body--hex">
    <ul class="bit-labels" aria-hidden="true">
      <li v-for="bit in BITS" :key="bit">{{ 1 << bit }}</li>
    </ul>
    <output class="hex-digit" :aria-label="`Value ${value}`">
      {{ value.toString(16).toUpperCase() }}
    </output>
  </div>
</template>
