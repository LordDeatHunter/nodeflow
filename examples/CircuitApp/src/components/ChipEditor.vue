<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Nodeflow, type NodeflowData } from "@nodeflow-lib/vue";
import SelectionToolbar from "./SelectionToolbar.vue";
import {
  closeChipEditor,
  editorCanvas,
  editorSession,
  isTerminal,
  populateEditor,
  protectTerminals,
  renameEditedType,
  saveChipEdit,
  useEditorProblems,
} from "../chipEditor";
import { setupEvents } from "../circuit";
import { startSimulation } from "../simulation";
import { syncBackgroundGrid } from "../backgroundGrid";
import { CANVAS_CSS, CANVAS_OPTIONS } from "../canvas";

const MAX_LISTED_PROBLEMS = 5;
const SUBSCRIPTION = "circuit:editor-validate";

/** Full-screen editor for the saved chip type in `editorSession`. */
const contentRevision = ref(0);
const problems = useEditorProblems(contentRevision);
const cleanups: Array<() => void> = [];

const onReady = (canvas: NodeflowData) => {
  editorCanvas.value = canvas;
  setupEvents(canvas);
  protectTerminals(canvas);
  populateEditor(canvas);
  cleanups.push(startSimulation(canvas), syncBackgroundGrid(canvas));
  canvas.eventStore.onContentChanged.subscribe(SUBSCRIPTION, () => {
    contentRevision.value++;
  });
  contentRevision.value++;
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape") closeChipEditor();
};

onMounted(() => document.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeyDown);
  editorCanvas.value?.eventStore.onContentChanged.unsubscribe(SUBSCRIPTION);
  cleanups.forEach((cleanup) => cleanup());
  editorCanvas.value = undefined;
});
</script>

<template>
  <div class="editor-overlay">
    <header class="editor-header">
      <div class="editor-title">
        <span class="editor-kicker">Editing chip type</span>
        <input
          class="editor-name"
          :value="editorSession?.name ?? ''"
          aria-label="Chip type name"
          @input="renameEditedType(($event.target as HTMLInputElement).value)"
          @keydown.stop
        />
      </div>
      <SelectionToolbar
        v-if="editorCanvas"
        :nodeflow="editorCanvas"
        :include="(node) => !isTerminal(node)"
        toolbar-class="editor-selection"
      >
        <template #fallback>
          <p class="editor-hint">
            Drag parts in from the palette and wire the Inputs and Outputs
            terminals to them. Use + / − to change how many pins the chip has;
            unused pins are dropped on save. Unwired inner inputs read low.
          </p>
        </template>
      </SelectionToolbar>
      <div class="editor-actions">
        <button type="button" class="toolbar-button" @click="closeChipEditor">
          Cancel
        </button>
        <button
          type="button"
          class="toolbar-button toolbar-button--primary"
          :disabled="problems.length > 0"
          :title="
            problems.length > 0
              ? 'Fix the problems listed first'
              : 'Save the type and update its chips'
          "
          @click="saveChipEdit"
        >
          Save type
        </button>
      </div>
    </header>
    <!-- Not positioned, so the canvas's offsets are measured from the
         overlay at the page origin, which is what core expects. -->
    <div class="editor-canvas">
      <Nodeflow
        id="chip-editor"
        :options="CANVAS_OPTIONS"
        :css="CANVAS_CSS"
        @ready="onReady"
      />
    </div>
    <div v-if="problems.length > 0" class="editor-problems" role="status">
      <strong>Can't save yet</strong>
      <ul>
        <li v-for="problem in problems.slice(0, MAX_LISTED_PROBLEMS)" :key="problem">
          {{ problem }}
        </li>
        <li v-if="problems.length > MAX_LISTED_PROBLEMS">
          …and {{ problems.length - MAX_LISTED_PROBLEMS }} more
        </li>
      </ul>
    </div>
  </div>
</template>
