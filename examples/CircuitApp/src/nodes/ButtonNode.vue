<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { simulationOf } from "../simulation";
import { stop, updateCustomData, useCustomData } from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const pressed = ref(false);

const setPressed = (value: boolean) => {
  if (pressed.value === value) return;
  pressed.value = value;
  simulationOf(props.node.nodeflow)?.setPressed(props.node.id, value);
};

// The pointer may be released anywhere, not only over the button.
const release = () => setPressed(false);

const press = (event: PointerEvent) => {
  event.stopPropagation();
  if (event.button !== 0) return;
  setPressed(true);
  document.addEventListener("pointerup", release, { once: true });
  document.addEventListener("pointercancel", release, { once: true });
};

const onKey = (event: KeyboardEvent, down: boolean) => {
  event.stopPropagation();
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    setPressed(down);
  }
};

onBeforeUnmount(() => {
  document.removeEventListener("pointerup", release);
  document.removeEventListener("pointercancel", release);
});
</script>

<template>
  <div class="node-body node-body--source">
    <input
      class="node-name"
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
      @mousedown="stop"
    />
    <button
      type="button"
      class="push-button"
      :class="{ 'push-button--down': pressed }"
      :aria-pressed="pressed"
      aria-label="Hold to send a high signal"
      title="Hold to send a high signal"
      @pointerdown="press"
      @mousedown="stop"
      @keydown="onKey($event, true)"
      @keyup="onKey($event, false)"
      @blur="release"
    />
  </div>
</template>
