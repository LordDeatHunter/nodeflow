<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { stop, updateCustomData, useCustomData } from "./common";
import SwitchSymbol from "../components/parts/SwitchSymbol.vue";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const on = computed(() => !!data.value.on);
</script>

<template>
  <div class="part">
    <div class="part-stage">
      <SwitchSymbol :on="on" />
      <button
        type="button"
        class="part-hit toggle"
        role="switch"
        :aria-checked="on"
        :aria-label="`Turn ${on ? 'off' : 'on'}`"
        @pointerdown="stop"
        @mousedown="stop"
        @click="updateCustomData(node, { on: !on })"
      />
    </div>
    <input
      class="node-name part-name part-label"
      :value="data.name ?? ''"
      placeholder="Switch"
      aria-label="Switch name"
      @input="
        updateCustomData(node, {
          name: ($event.target as HTMLInputElement).value,
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    />
  </div>
</template>
