<script setup lang="ts">
import { PART_HEIGHT, PART_WIDTH } from "./geometry";

/** Two open contacts and a plunger that bridges them while pressed. */
defineProps<{ pressed?: boolean }>();
</script>

<template>
  <svg
    class="part-symbol"
    :viewBox="`0 0 ${PART_WIDTH} ${PART_HEIGHT}`"
    aria-hidden="true"
  >
    <line class="part-rail" x1="22" y1="34" x2="22" y2="62" />
    <line class="pin pin--on" x1="22" y1="48" x2="40" y2="48" />
    <line class="pin" :class="{ 'pin--on': pressed }" x1="100" y1="48" :x2="PART_WIDTH" y2="48" />
    <circle class="part-dot part-dot--on" cx="40" cy="48" r="4" />
    <circle class="part-contact" :class="{ 'part-contact--on': pressed }" cx="100" cy="48" r="4" />
    <g class="plunger" :class="{ 'plunger--down': pressed }">
      <line class="part-stroke" x1="58" y1="14" x2="82" y2="14" />
      <line class="part-stroke" x1="70" y1="14" x2="70" y2="32" />
      <line class="plunger-bar" x1="40" y1="32" x2="100" y2="32" />
    </g>
  </svg>
</template>
