<script setup lang="ts">
import { onBeforeUnmount } from "vue";

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;

const props = defineProps<{
  /** Marks a saved chip type. */
  saved?: boolean;
  /** Greys the slot out: it can't be dragged and has no menu. */
  disabled?: boolean;
  disabledReason?: string;
  removable?: boolean;
}>();
const emit = defineEmits<{
  /** The primary button went down: start dragging a node out. */
  drag: [event: PointerEvent];
  /** Right-click, or a long press on touch screens. */
  menu: [x: number, y: number];
  remove: [];
}>();

let pressTimer: ReturnType<typeof setTimeout> | undefined;
let pressStart = { x: 0, y: 0 };

const cancelPress = () => {
  clearTimeout(pressTimer);
  pressTimer = undefined;
};
onBeforeUnmount(cancelPress);

const onPointerDown = (event: PointerEvent) => {
  // Only the primary button drags a node out.
  if (event.button !== 0 || props.disabled) return;
  emit("drag", event);

  if (event.pointerType === "mouse") return;
  pressStart = { x: event.clientX, y: event.clientY };
  cancelPress();
  pressTimer = setTimeout(() => {
    pressTimer = undefined;
    emit("menu", pressStart.x, pressStart.y);
  }, LONG_PRESS_MS);
};

const onPointerMove = (event: PointerEvent) => {
  if (pressTimer === undefined) return;
  const moved = Math.hypot(
    event.clientX - pressStart.x,
    event.clientY - pressStart.y,
  );
  if (moved > LONG_PRESS_SLOP) cancelPress();
};

const onContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  if (props.disabled) return;
  // Touch long presses are handled by the timer above.
  if (pressTimer !== undefined) return;
  emit("menu", event.clientX, event.clientY);
};
</script>

<template>
  <div
    class="palette-slot"
    :class="{
      'palette-slot--saved': saved,
      'palette-slot--disabled': disabled,
    }"
    :title="disabled ? disabledReason : undefined"
    :aria-disabled="disabled"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="cancelPress"
    @pointercancel="cancelPress"
    @contextmenu="onContextMenu"
  >
    <span v-if="saved" class="slot-tag">Chip type</span>
    <slot />
    <button
      v-if="removable"
      type="button"
      class="slot-remove"
      title="Delete chip type"
      aria-label="Delete chip type"
      @pointerdown.stop
      @click="emit('remove')"
    >
      ×
    </button>
  </div>
</template>
