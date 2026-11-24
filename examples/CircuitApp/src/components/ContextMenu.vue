<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ContextMenuItem } from "./types";

const MENU_WIDTH = 184;
const ITEM_HEIGHT = 38;

/** A small floating menu that closes on an outside press or Escape. */
const props = defineProps<{
  x: number;
  y: number;
  title: string;
  items: Array<ContextMenuItem>;
}>();
const emit = defineEmits<{ close: [] }>();
const menu = ref<HTMLDivElement>();

const onPointerDown = (event: PointerEvent) => {
  if (!menu.value?.contains(event.target as Node)) emit("close");
};
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") emit("close");
};

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown);
  menu.value?.querySelector("button")?.focus();
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown);
});

// Keep the menu on screen, e.g. when opened near the bottom palette.
const left = computed(() =>
  Math.max(8, Math.min(props.x + 4, window.innerWidth - MENU_WIDTH - 8)),
);
const top = computed(() => {
  const height = 40 + props.items.length * ITEM_HEIGHT;
  return Math.max(8, Math.min(props.y + 4, window.innerHeight - height - 8));
});

const select = (item: ContextMenuItem) => {
  emit("close");
  item.onSelect();
};
</script>

<template>
  <div
    ref="menu"
    role="menu"
    class="context-menu"
    :style="{ left: `${left}px`, top: `${top}px` }"
    @contextmenu.prevent
  >
    <div class="context-menu-title">{{ title }}</div>
    <button
      v-for="item in items"
      :key="item.label"
      type="button"
      role="menuitem"
      class="context-menu-item"
      :class="{ 'context-menu-item--danger': item.danger }"
      @click="select(item)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
