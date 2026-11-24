<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { inputLevel } from "./common";
import HexSymbol from "../components/parts/HexSymbol.vue";

const props = defineProps<{ node: NodeflowNodeData }>();

/** Inputs top to bottom are the 1, 2, 4 and 8 bits. */
const bits = computed(() =>
  [0, 1, 2, 3].map((bit) => inputLevel(props.node, `input-${bit}`)),
);
</script>

<template>
  <div class="part">
    <div class="part-stage">
      <HexSymbol :bits="bits" />
    </div>
  </div>
</template>
