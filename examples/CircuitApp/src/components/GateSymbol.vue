<script setup lang="ts">
import { computed } from "vue";
import type { GateKind } from "../simulation";
import {
  BODY_TRANSFORM,
  GATE_HEIGHT,
  GATE_WIDTH,
  gateGeometry,
} from "./gateShape";

/**
 * A gate's distinctive-shape (ANSI) symbol with its pins, in node pixels.
 * Lit pins and outline show which signals are high.
 */
const props = defineProps<{
  kind: GateKind;
  /** Whether the output is high. */
  on?: boolean;
  /** Which inputs are high, by index. */
  inputsOn?: Array<boolean>;
}>();

const geometry = computed(() => gateGeometry(props.kind));
</script>

<template>
  <svg
    class="gate-symbol"
    :class="{ 'gate-symbol--on': on }"
    :viewBox="`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`"
    aria-hidden="true"
  >
    <line
      v-for="(pin, i) in geometry.inputs"
      :key="i"
      class="gate-pin"
      :class="{ 'gate-pin--on': inputsOn?.[i] }"
      :x1="pin.x1"
      :x2="pin.x2"
      :y1="pin.y"
      :y2="pin.y"
    />
    <line
      class="gate-pin"
      :class="{ 'gate-pin--on': on }"
      :x1="geometry.output.x1"
      :x2="geometry.output.x2"
      :y1="geometry.output.y"
      :y2="geometry.output.y"
    />
    <g :transform="BODY_TRANSFORM">
      <path v-if="geometry.tail" class="gate-line" :d="geometry.tail" />
      <path class="gate-body" :d="geometry.body" />
      <circle
        v-if="geometry.bubble"
        class="gate-body"
        :cx="geometry.bubble.cx"
        :cy="geometry.bubble.cy"
        :r="geometry.bubble.r"
      />
    </g>
  </svg>
</template>
