<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { GATE_KINDS, type GateKind } from "../simulation";
import { setGateKind } from "../circuit";
import { outputLevel, stop, useCustomData } from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const gate = computed<GateKind>(() => data.value.gate ?? "AND");
const high = computed(() => !!outputLevel(props.node, "output-0"));

// Distinctive-shape (ANSI) symbols, drawn in a 70×40 box.
const AND_BODY = "M8 4 H30 A16 16 0 0 1 30 36 H8 Z";
const OR_BODY = "M8 4 Q30 4 54 20 Q30 36 8 36 Q18 20 8 4 Z";
const XOR_TAIL = "M2 4 Q12 20 2 36";
const BUFFER_BODY = "M10 4 L50 20 L10 36 Z";

const symbol = computed(() => {
  switch (gate.value) {
    case "AND":
      return { body: AND_BODY };
    case "NAND":
      return { body: AND_BODY, bubble: 50 };
    case "OR":
      return { body: OR_BODY };
    case "NOR":
      return { body: OR_BODY, bubble: 58 };
    case "XOR":
      return { body: OR_BODY, tail: XOR_TAIL };
    case "XNOR":
      return { body: OR_BODY, tail: XOR_TAIL, bubble: 58 };
    case "BUFFER":
      return { body: BUFFER_BODY };
    case "NOT":
      return { body: BUFFER_BODY, bubble: 54 };
  }
});
</script>

<template>
  <div class="node-body node-body--gate">
    <svg
      class="gate-symbol"
      :class="{ 'gate-symbol--on': high }"
      viewBox="0 0 70 40"
      aria-hidden="true"
    >
      <path v-if="symbol.tail" class="gate-line" :d="symbol.tail" />
      <path class="gate-body" :d="symbol.body" />
      <circle
        v-if="symbol.bubble !== undefined"
        class="gate-body"
        :cx="symbol.bubble"
        cy="20"
        r="4"
      />
    </svg>
    <select
      class="gate-kind"
      :value="gate"
      aria-label="Gate type"
      @change="
        setGateKind(node, ($event.target as HTMLSelectElement).value as GateKind)
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    >
      <option v-for="kind in GATE_KINDS" :key="kind" :value="kind">
        {{ kind }}
      </option>
    </select>
  </div>
</template>
