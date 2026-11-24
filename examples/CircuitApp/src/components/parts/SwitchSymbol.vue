<script setup lang="ts">
import { PART_HEIGHT, PART_WIDTH } from "./geometry";

/** A supply rail and a blade that swings shut onto the output contact. */
defineProps<{ on?: boolean }>();
</script>

<template>
  <svg
    class="part-symbol"
    :viewBox="`0 0 ${PART_WIDTH} ${PART_HEIGHT}`"
    aria-hidden="true"
  >
    <line class="part-rail" x1="22" y1="34" x2="22" y2="62" />
    <line class="pin pin--on" x1="22" y1="48" x2="40" y2="48" />
    <line class="pin" :class="{ 'pin--on': on }" x1="100" y1="48" :x2="PART_WIDTH" y2="48" />
    <line
      class="switch-blade"
      :class="{ 'switch-blade--closed': on }"
      x1="40"
      y1="48"
      x2="99"
      y2="48"
    />
    <circle class="part-dot part-dot--on" cx="40" cy="48" r="4" />
    <circle class="part-contact" :class="{ 'part-contact--on': on }" cx="100" cy="48" r="4" />
  </svg>
</template>
