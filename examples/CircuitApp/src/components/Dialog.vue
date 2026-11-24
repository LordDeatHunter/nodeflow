<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

/** A small modal: closes on Escape or a press on the backdrop. */
const props = defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLDivElement>();

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  // Don't also cancel the chip editor underneath.
  event.stopImmediatePropagation();
  emit("close");
};

onMounted(() => {
  // Capture phase, so it runs before the editor's own Escape handler.
  document.addEventListener("keydown", onKeyDown, true);
  panel.value
    ?.querySelector<HTMLElement>("input, textarea, button")
    ?.focus();
});
onBeforeUnmount(() =>
  document.removeEventListener("keydown", onKeyDown, true),
);
</script>

<template>
  <div
    class="dialog-backdrop"
    @pointerdown="$event.target === $event.currentTarget && emit('close')"
  >
    <!-- Typing stays out of the canvases' keyboard shortcuts. -->
    <div
      ref="panel"
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="props.title"
      @keydown.stop
    >
      <h2 class="dialog-title">{{ props.title }}</h2>
      <slot />
      <div class="dialog-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
