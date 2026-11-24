<script setup lang="ts">
import type { GateKind } from "../simulation";
import type { PaletteType } from "../circuit";
import GateSymbol from "./GateSymbol.vue";
import SwitchSymbol from "./parts/SwitchSymbol.vue";
import ButtonSymbol from "./parts/ButtonSymbol.vue";
import ClockSymbol from "./parts/ClockSymbol.vue";
import LampSymbol from "./parts/LampSymbol.vue";
import HexSymbol from "./parts/HexSymbol.vue";

/** A part's symbol at rest, for the parts bin and drag preview. */
defineProps<{ type: PaletteType; gate?: GateKind }>();

const CLOCK_TRACE = [false, false, true, true, false, false, true, true];
const HEX_BITS = [true, false, true, false];
</script>

<template>
  <GateSymbol v-if="type === 'gate' && gate" class="slot-icon" :kind="gate" />
  <SwitchSymbol v-else-if="type === 'switch'" class="slot-icon" on />
  <ButtonSymbol v-else-if="type === 'button'" class="slot-icon" />
  <ClockSymbol v-else-if="type === 'clock'" class="slot-icon" :trace="CLOCK_TRACE" />
  <LampSymbol v-else-if="type === 'lamp'" class="slot-icon" on />
  <HexSymbol v-else-if="type === 'hex'" class="slot-icon" :bits="HEX_BITS" />
</template>
