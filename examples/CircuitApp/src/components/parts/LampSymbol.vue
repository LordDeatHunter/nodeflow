<script setup lang="ts">
import { PART_HEIGHT, PART_WIDTH } from "./geometry";

/** The schematic lamp: a bulb with a crossed filament that glows. */
defineProps<{ on?: boolean }>();
</script>

<template>
  <svg
    class="part-symbol lamp"
    :class="{ 'lamp--on': on }"
    :viewBox="`0 0 ${PART_WIDTH} ${PART_HEIGHT}`"
    role="img"
    :aria-label="on ? 'Lamp on' : 'Lamp off'"
  >
    <line class="pin" :class="{ 'pin--on': on }" x1="0" y1="48" x2="52" y2="48" />
    <circle class="lamp-halo" cx="74" cy="48" r="34" />
    <circle class="lamp-bulb" cx="74" cy="48" r="22" />
    <path class="lamp-filament" d="M58.4 32.4 L89.6 63.6 M89.6 32.4 L58.4 63.6" />
  </svg>
</template>
