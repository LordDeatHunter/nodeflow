<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { simulationOf } from "../simulation";
import { stop, updateCustomData, useCustomData } from "./common";
import ButtonSymbol from "../components/parts/ButtonSymbol.vue";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const pressed = ref(false);
const LISTEN = { once: true, capture: true };

const setPressed = (value: boolean) => {
  if (pressed.value === value) return;
  pressed.value = value;
  simulationOf(props.node.nodeflow)?.setPressed(props.node.id, value);
};

// The pointer may be released anywhere, not only over the button. Captured,
// since nodes and the canvas stop their pointerups from bubbling.
const release = () => setPressed(false);

const press = (event: PointerEvent) => {
  event.stopPropagation();
  if (event.button !== 0) return;
  setPressed(true);
  document.addEventListener("pointerup", release, LISTEN);
  document.addEventListener("pointercancel", release, LISTEN);
};

const onKey = (event: KeyboardEvent, down: boolean) => {
  event.stopPropagation();
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    setPressed(down);
  }
};

onBeforeUnmount(() => {
  document.removeEventListener("pointerup", release, true);
  document.removeEventListener("pointercancel", release, true);
});
</script>

<template>
  <div class="part">
    <div class="part-stage">
      <ButtonSymbol :pressed="pressed" />
      <button
        type="button"
        class="part-hit push-button"
        :aria-pressed="pressed"
        aria-label="Hold to send a high signal"
        title="Hold to send a high signal"
        @pointerdown="press"
        @touchstart="stop"
        @mousedown="stop"
        @keydown="onKey($event, true)"
        @keyup="onKey($event, false)"
        @blur="release"
      />
    </div>
    <input
      class="node-name part-name part-label"
      :value="data.name ?? ''"
      placeholder="Button"
      aria-label="Button name"
      @input="
        updateCustomData(node, {
          name: ($event.target as HTMLInputElement).value,
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @touchstart="stop"
      @mousedown="stop"
    />
  </div>
</template>
