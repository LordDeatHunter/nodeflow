import {
  Component,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  closeTemplateEditor,
  EditorCanvas,
  editorData,
  editorSession,
  renameEditedType,
  saveTemplateEdit,
  validateEditor,
} from "./editor";
import { blueprintRevision } from "./reactivity";
import { syncBackgroundGrid } from "./backgroundGrid";
import appCss from "./styles/app.module.scss";

const MAX_LISTED_PROBLEMS = 5;

/** Full-screen editor for the saved derived type in `editorSession`. */
const DerivedTypeEditor: Component = () => {
  const [contentRevision, setContentRevision] = createSignal(0);

  onMount(() => {
    editorData.eventStore.onContentChanged.subscribe(
      "blueprint:editor-validate",
      () => setContentRevision((revision) => revision + 1),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTemplateEditor();
    };
    document.addEventListener("keydown", onKeyDown);
    const stopGrid = syncBackgroundGrid(editorData);

    onCleanup(() => {
      editorData.eventStore.onContentChanged.unsubscribe(
        "blueprint:editor-validate",
      );
      document.removeEventListener("keydown", onKeyDown);
      stopGrid();
    });
  });

  const problems = createMemo(() => {
    contentRevision();
    blueprintRevision();
    return validateEditor();
  });

  return (
    <div class={appCss.editorOverlay}>
      <header class={appCss.editorHeader}>
        <div class={appCss.editorTitle}>
          <span class={appCss.editorKicker}>Editing saved type</span>
          <input
            class={appCss.editorName}
            value={editorSession()?.name ?? ""}
            aria-label="Type name"
            onInput={(event) => renameEditedType(event.currentTarget.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        <p class={appCss.editorHint}>
          Drag nodes in from the palette and wire the Inputs and Outputs
          terminals to them. Use + / − to change how many ports there are;
          unused ports are dropped on save.
        </p>
        <div class={appCss.editorActions}>
          <button
            type="button"
            class={appCss.toolbarButton}
            onClick={closeTemplateEditor}
          >
            Cancel
          </button>
          <button
            type="button"
            class={`${appCss.toolbarButton} ${appCss.primaryButton}`}
            disabled={problems().length > 0}
            title={
              problems().length > 0
                ? "Every inner connector must be wired first"
                : "Save the type and update its instances"
            }
            onClick={saveTemplateEdit}
          >
            Save type
          </button>
        </div>
      </header>
      {/* Not positioned, so the canvas's offsets are measured from the
          overlay at the page origin, which is what core expects. */}
      <div class={appCss.editorCanvas}>
        <EditorCanvas />
      </div>
      <Show when={problems().length > 0}>
        <div class={appCss.editorProblems} role="status">
          <strong>Can't save yet</strong>
          <ul>
            <For each={problems().slice(0, MAX_LISTED_PROBLEMS)}>
              {(problem) => <li>{problem}</li>}
            </For>
            <Show when={problems().length > MAX_LISTED_PROBLEMS}>
              <li>…and {problems().length - MAX_LISTED_PROBLEMS} more</li>
            </Show>
          </ul>
        </div>
      </Show>
    </div>
  );
};

export default DerivedTypeEditor;
