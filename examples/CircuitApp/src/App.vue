<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import {
  Nodeflow,
  NodeflowRegistry,
  Vec2,
  type NodeflowData,
  type NodeTemplate,
} from "@nodeflow-lib/vue";
import PaletteSlot from "./components/PaletteSlot.vue";
import ContextMenu from "./components/ContextMenu.vue";
import SelectionToolbar from "./components/SelectionToolbar.vue";
import ChipEditor from "./components/ChipEditor.vue";
import ChipTypeDialogs from "./components/ChipTypeDialogs.vue";
import type {
  ChipTypeDialogState,
  ContextMenuItem,
} from "./components/types";
import {
  createCircuitNode,
  setupChipTypePersistence,
  setupDemoCircuit,
  setupEvents,
  spawnChipType,
  type PaletteType,
} from "./circuit";
import {
  activeCanvas,
  editorSession,
  isTypeLockedInEditor,
  openChipEditor,
} from "./chipEditor";
import {
  clocksPaused,
  setClocksPaused,
  simulationOf,
  startSimulation,
  stepClocks,
  type CircuitSimulation,
} from "./simulation";
import { syncBackgroundGrid } from "./backgroundGrid";
import { CANVAS_CSS, CANVAS_OPTIONS } from "./canvas";
import { mainCanvas } from "./state";

interface PaletteEntry {
  label: string;
  type: PaletteType;
  data?: Partial<CustomNodeflowDataType>;
}

const PALETTE: Array<PaletteEntry> = [
  { label: "Switch", type: "switch" },
  { label: "Push button", type: "button" },
  { label: "Clock", type: "clock" },
  { label: "AND", type: "gate", data: { gate: "AND" } },
  { label: "OR", type: "gate", data: { gate: "OR" } },
  { label: "NOT", type: "gate", data: { gate: "NOT" } },
  { label: "NAND", type: "gate", data: { gate: "NAND" } },
  { label: "NOR", type: "gate", data: { gate: "NOR" } },
  { label: "XOR", type: "gate", data: { gate: "XOR" } },
  { label: "Lamp", type: "lamp" },
  { label: "Hex display", type: "hex" },
];

type Preview =
  | { kind: "node"; entry: PaletteEntry }
  | { kind: "saved"; templateId: string; name: string };

const labelOf = (preview: Preview) =>
  preview.kind === "node" ? preview.entry.label : preview.name;

const savedTypes = ref<Array<NodeTemplate>>([]);
const nodePreview = shallowRef<Preview | undefined>();
const cursor = ref({ x: 0, y: 0 });
const menu = shallowRef<{ x: number; y: number; preview: Preview }>();
const paletteOpen = ref(false);
const dialog = shallowRef<ChipTypeDialogState>();
const dialogKey = ref(0);
const palette = ref<HTMLDivElement>();
const mainSimulation = shallowRef<CircuitSimulation>();
const cleanups: Array<() => void> = [];

const openDialog = (state: ChipTypeDialogState) => {
  dialogKey.value++;
  dialog.value = state;
};

const spawn = (preview: Preview, position: Vec2, centered: boolean) => {
  const canvas = activeCanvas();
  if (preview.kind === "node") {
    createCircuitNode(
      preview.entry.type,
      position,
      centered,
      canvas,
      preview.entry.data,
    );
  } else {
    spawnChipType(preview.templateId, position, centered, canvas);
  }
};

const removeType = (templateId: string) =>
  mainCanvas.value?.templates.remove(templateId);

const menuItems = (preview: Preview): Array<ContextMenuItem> => {
  const spawnInCenter = () => spawn(preview, activeCanvas().center(), true);
  if (preview.kind === "node") {
    return [{ label: "Spawn", onSelect: spawnInCenter }];
  }
  const { templateId } = preview;
  return [
    { label: "Spawn", onSelect: spawnInCenter },
    // Opening another type would throw away the edit in progress.
    ...(editorSession.value
      ? []
      : [{ label: "Edit", onSelect: () => openChipEditor(templateId) }]),
    {
      label: "Rename",
      onSelect: () => openDialog({ kind: "rename", templateId }),
    },
    {
      label: "Export",
      onSelect: () => openDialog({ kind: "export", templateIds: [templateId] }),
    },
    { label: "Delete", danger: true, onSelect: () => removeType(templateId) },
  ];
};

const openMenu = (preview: Preview, x: number, y: number) => {
  // A right-click or long press is not a drag.
  nodePreview.value = undefined;
  menu.value = { x, y, preview };
};

const startPreview = (preview: Preview, event: PointerEvent) => {
  cursor.value = { x: event.clientX, y: event.clientY };
  nodePreview.value = preview;
};

const savedPreview = (template: NodeTemplate): Preview => ({
  kind: "saved",
  templateId: template.id,
  name: template.name,
});

/** Drops the dragged palette entry where the pointer was released. */
const dropPreview = ({ event }: { event: PointerEvent }) => {
  const preview = nodePreview.value;
  if (!preview) return;
  nodePreview.value = undefined;

  const canvas = activeCanvas();
  const clickPos = Vec2.fromEvent(event);
  if (!clickPos.isWithinRect(canvas.startPosition, canvas.size)) return;
  // The open palette covers the bottom of the canvas; dropping on it cancels
  // the drag. Tested by point, since touch pointerups target the slot the
  // drag began on.
  const paletteRect = palette.value?.getBoundingClientRect();
  if (paletteRect && clickPos.y >= paletteRect.top) return;

  const position = clickPos
    .subtract(canvas.startPosition)
    .divideBy(canvas.zoomLevel)
    .subtract(canvas.position);
  spawn(preview, position, true);
};

const onReady = (canvas: NodeflowData) => {
  mainCanvas.value = canvas;
  setupEvents(canvas);
  setupChipTypePersistence(canvas);
  setupDemoCircuit(canvas);
  cleanups.push(startSimulation(canvas), syncBackgroundGrid(canvas));
  mainSimulation.value = simulationOf(canvas);

  savedTypes.value = canvas.templates.list();
  canvas.eventStore.onTemplatesChanged.subscribe(
    "circuit:palette",
    ({ templates }) => {
      savedTypes.value = [...templates];
    },
  );

  const { globalEventStore } = NodeflowRegistry.get();
  globalEventStore.onMouseMoveInDocument.subscribe(
    "circuit:track-cursor",
    ({ event }) => {
      if (nodePreview.value) {
        cursor.value = { x: event.clientX, y: event.clientY };
      }
    },
  );
  globalEventStore.onPointerUpInDocument.subscribe(
    "circuit:drop-node",
    dropPreview,
  );
};

onBeforeUnmount(() => {
  const { globalEventStore } = NodeflowRegistry.get();
  globalEventStore.onMouseMoveInDocument.unsubscribe("circuit:track-cursor");
  globalEventStore.onPointerUpInDocument.unsubscribe("circuit:drop-node");
  cleanups.forEach((cleanup) => cleanup());
});

const oscillating = computed(() => !!mainSimulation.value?.oscillating.value);
</script>

<template>
  <div class="app">
    <div class="viewport">
      <Nodeflow
        id="main"
        :options="CANVAS_OPTIONS"
        :css="CANVAS_CSS"
        @ready="onReady"
      />

      <!-- The editor covers the main canvas and has its own toolbar. -->
      <template v-if="!editorSession && mainCanvas">
        <div class="sim-panel">
          <span class="sim-title">Logic circuits</span>
          <button
            type="button"
            class="toolbar-button"
            :aria-pressed="clocksPaused"
            @click="setClocksPaused(!clocksPaused)"
          >
            {{ clocksPaused ? "Resume clocks" : "Pause clocks" }}
          </button>
          <button
            type="button"
            class="toolbar-button"
            :disabled="!clocksPaused"
            title="Advance every clock half a cycle"
            @click="stepClocks"
          >
            Step
          </button>
          <span v-if="oscillating" class="sim-warning" role="status">
            Oscillating — a loop never settles
          </span>
        </div>
        <SelectionToolbar :nodeflow="mainCanvas" />
      </template>
      <ChipEditor v-if="editorSession" :key="editorSession.templateId" />
    </div>

    <div
      ref="palette"
      class="palette"
      :class="{ 'palette--open': paletteOpen }"
    >
      <button
        type="button"
        class="palette-toggle"
        :aria-expanded="paletteOpen"
        aria-controls="part-palette"
        @click="paletteOpen = !paletteOpen"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2 8l4-4 4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ paletteOpen ? "Hide parts" : "Parts" }}
      </button>
      <!-- Closed: out of the tab order and away from screen readers. -->
      <div id="part-palette" class="hotbar" :inert="!paletteOpen || undefined">
        <div class="hotbar-header">
          <h1 class="hotbar-title">Parts bin</h1>
          <p v-if="editorSession" class="hotbar-hint">
            Drag a part into the chip being edited to add it. The chip itself,
            and chips built from it, can't be added.
          </p>
          <p v-else class="hotbar-hint">
            Drag a part onto the board, then wire an output (right) to an input
            (left). Right-click (long-press) a part for more. Select parts to
            group them or turn them into a chip.
          </p>
          <div class="hotbar-actions">
            <button
              type="button"
              class="link-button"
              @click="openDialog({ kind: 'import' })"
            >
              Import chip types
            </button>
            <button
              v-if="savedTypes.length > 0"
              type="button"
              class="link-button"
              @click="openDialog({ kind: 'export' })"
            >
              Export all chip types
            </button>
          </div>
        </div>
        <div class="slots">
          <PaletteSlot
            v-for="entry in PALETTE"
            :key="entry.label"
            @drag="startPreview({ kind: 'node', entry }, $event)"
            @menu="(x, y) => openMenu({ kind: 'node', entry }, x, y)"
          >
            {{ entry.label }}
          </PaletteSlot>
          <PaletteSlot
            v-for="template in savedTypes"
            :key="template.id"
            saved
            :disabled="isTypeLockedInEditor(template.id)"
            disabled-reason="A chip can't contain itself"
            :removable="!isTypeLockedInEditor(template.id)"
            @drag="startPreview(savedPreview(template), $event)"
            @menu="(x, y) => openMenu(savedPreview(template), x, y)"
            @remove="removeType(template.id)"
          >
            {{ template.name }}
          </PaletteSlot>
        </div>
      </div>
    </div>

    <div
      v-if="nodePreview"
      class="preview-card"
      :style="{ left: `${cursor.x - 60}px`, top: `${cursor.y - 32}px` }"
    >
      {{ labelOf(nodePreview) }}
    </div>
    <ContextMenu
      v-if="menu"
      :x="menu.x"
      :y="menu.y"
      :title="labelOf(menu.preview)"
      :items="menuItems(menu.preview)"
      @close="menu = undefined"
    />
    <ChipTypeDialogs
      v-if="dialog"
      :key="dialogKey"
      :dialog="dialog"
      @close="dialog = undefined"
    />
  </div>
</template>
