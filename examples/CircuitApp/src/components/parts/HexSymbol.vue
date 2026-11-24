<script setup lang="ts">
import { computed } from "vue";
import { connectorYs, HEX_HEIGHT, PART_WIDTH } from "./geometry";

/** A seven-segment digit fed by four bit pins (1, 2, 4, 8 top to bottom). */
const props = defineProps<{ bits: Array<boolean> }>();

const SEGMENTS = {
  a: "M76 20 H106",
  b: "M110 25 V55",
  c: "M110 65 V95",
  d: "M76 100 H106",
  e: "M72 65 V95",
  f: "M72 25 V55",
  g: "M76 60 H106",
} as const;
type Segment = keyof typeof SEGMENTS;
const SEGMENT_NAMES = Object.keys(SEGMENTS) as Array<Segment>;

/** Lit segments for 0–F. */
const DIGITS = [
  "abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc",
  "abcdefg", "abcdfg", "abcefg", "cdefg", "adef", "bcdeg", "adefg", "aefg",
];

const pinYs = connectorYs(4, HEX_HEIGHT);
const value = computed(() =>
  props.bits.reduce((total, on, bit) => (on ? total + (1 << bit) : total), 0),
);
const lit = computed(() => DIGITS[value.value]);
</script>

<template>
  <svg
    class="part-symbol"
    :viewBox="`0 0 ${PART_WIDTH} ${HEX_HEIGHT}`"
    role="img"
    :aria-label="`Shows ${value.toString(16).toUpperCase()}`"
  >
    <g v-for="(y, bit) in pinYs" :key="bit">
      <line class="pin" :class="{ 'pin--on': bits[bit] }" x1="0" :y1="y" x2="44" :y2="y" />
      <text class="bit-label" :class="{ 'bit-label--on': bits[bit] }" x="30" :y="y - 6">
        {{ 1 << bit }}
      </text>
    </g>
    <rect class="scope" x="44" y="6" width="90" height="108" rx="8" />
    <g transform="translate(91 60) skewX(-6) translate(-91 -60)">
      <path
        v-for="name in SEGMENT_NAMES"
        :key="name"
        class="segment"
        :class="{ 'segment--on': lit.includes(name) }"
        :d="SEGMENTS[name]"
      />
    </g>
  </svg>
</template>
