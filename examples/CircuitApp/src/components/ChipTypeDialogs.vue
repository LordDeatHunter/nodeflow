<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import Dialog from "./Dialog.vue";
import type { ChipTypeDialogState } from "./types";
import { exportChipTypes, importChipTypes, renameChipType } from "../chipTypes";
import { getMainCanvas } from "../state";

/**
 * Rename, export and import dialogs for saved chip types. Each opening
 * mounts this component afresh (keyed by the caller), so the state below
 * is read once, for the dialog it was opened as.
 */
const props = defineProps<{ dialog: ChipTypeDialogState }>();
const emit = defineEmits<{ close: [] }>();
const close = () => emit("close");

// ─── Rename ──────────────────────────────────────────────────────────────────

const renameId = props.dialog.kind === "rename" ? props.dialog.templateId : "";
const name = ref(getMainCanvas().templates.get(renameId)?.name ?? "");
const nameInput = ref<HTMLInputElement>();

const rename = () => {
  if (name.value.trim() === "") return;
  renameChipType(renameId, name.value);
  close();
};

// ─── Export ──────────────────────────────────────────────────────────────────

const exportIds =
  props.dialog.kind === "export" ? props.dialog.templateIds : undefined;
const exportText = props.dialog.kind === "export" ? exportChipTypes(exportIds) : "";
const exportCount = exportIds?.length ?? getMainCanvas().templates.size;
const copied = ref(false);
const exportArea = ref<HTMLTextAreaElement>();

const copy = async () => {
  try {
    await navigator.clipboard.writeText(exportText);
  } catch {
    // No clipboard access (e.g. not a secure context): use the selection.
    exportArea.value?.select();
    document.execCommand("copy");
  }
  copied.value = true;
};

// ─── Import ──────────────────────────────────────────────────────────────────

const importText = ref("");
const importError = ref("");

const submitImport = () => {
  try {
    const { added, skipped } = importChipTypes(importText.value);
    if (added.length === 0) {
      importError.value = `Already saved: ${skipped} ${
        skipped === 1 ? "type" : "types"
      }.`;
      return;
    }
    close();
  } catch (problem) {
    importError.value =
      problem instanceof Error ? problem.message : String(problem);
  }
};

const title = computed(() => {
  switch (props.dialog.kind) {
    case "rename":
      return "Rename chip type";
    case "export":
      return exportCount === 1
        ? "Export chip type"
        : `Export ${exportCount} chip types`;
    case "import":
      return "Import chip types";
  }
});

onMounted(async () => {
  await nextTick();
  requestAnimationFrame(() => nameInput.value?.select());
});
</script>

<template>
  <Dialog :title="title" @close="close">
    <template v-if="dialog.kind === 'rename'">
      <input
        ref="nameInput"
        v-model="name"
        class="dialog-input"
        aria-label="Name"
        @keydown.enter="rename"
      />
      <p class="dialog-note">
        Placed chips that still use the old name are renamed too.
      </p>
    </template>

    <template v-else-if="dialog.kind === 'export'">
      <textarea
        ref="exportArea"
        class="dialog-text"
        readonly
        :value="exportText"
        aria-label="Export string"
        @focus="($event.target as HTMLTextAreaElement).select()"
      />
      <p class="dialog-note">
        Paste this into Import, here or in another browser, to add the
        {{ exportCount === 1 ? "type" : "types" }} there.
      </p>
    </template>

    <template v-else>
      <textarea
        v-model="importText"
        class="dialog-text"
        placeholder="Paste an export string"
        aria-label="Export string to import"
        @input="importError = ''"
      />
      <p v-if="importError" class="dialog-error" role="alert">
        {{ importError }}
      </p>
    </template>

    <template #actions>
      <button type="button" class="toolbar-button" @click="close">
        {{ dialog.kind === "export" ? "Close" : "Cancel" }}
      </button>
      <button
        v-if="dialog.kind === 'rename'"
        type="button"
        class="toolbar-button toolbar-button--primary"
        :disabled="name.trim() === ''"
        @click="rename"
      >
        Rename
      </button>
      <button
        v-else-if="dialog.kind === 'export'"
        type="button"
        class="toolbar-button toolbar-button--primary"
        @click="copy"
      >
        {{ copied ? "Copied" : "Copy" }}
      </button>
      <button
        v-else
        type="button"
        class="toolbar-button toolbar-button--primary"
        :disabled="importText.trim() === ''"
        @click="submitImport"
      >
        Import
      </button>
    </template>
  </Dialog>
</template>
