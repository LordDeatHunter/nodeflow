import {
  Component,
  createSignal,
  Match,
  Show,
  Switch,
  untrack,
} from "solid-js";
import Dialog from "./Dialog";
import {
  exportSavedTypes,
  importSavedTypes,
  renameSavedType,
} from "./savedTypes";
import { nodeflowData } from "./App";
import appCss from "./styles/app.module.scss";

export type SavedTypeDialogState =
  | { kind: "rename"; templateId: string }
  /** Every saved type when `templateIds` is left out. */
  | { kind: "export"; templateIds?: Array<string> }
  | { kind: "import" };

const RenameDialog: Component<{ templateId: string; onClose: () => void }> = (
  props,
) => {
  // Read once: each dialog is created fresh for the type it was opened on.
  const template = untrack(() => nodeflowData.templates.get(props.templateId));
  const [name, setName] = createSignal(template?.name ?? "");

  const save = () => {
    renameSavedType(props.templateId, name());
    props.onClose();
  };

  return (
    <Dialog
      title="Rename saved type"
      onClose={props.onClose}
      actions={
        <>
          <button
            type="button"
            class={appCss.toolbarButton}
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            class={`${appCss.toolbarButton} ${appCss.primaryButton}`}
            disabled={name().trim() === ""}
            onClick={save}
          >
            Rename
          </button>
        </>
      }
    >
      <input
        class={appCss.dialogInput}
        value={name()}
        aria-label="Name"
        onInput={(event) => setName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && name().trim() !== "") save();
        }}
        ref={(el) => requestAnimationFrame(() => el.select())}
      />
      <p class={appCss.dialogNote}>
        Placed copies that still use the old name are renamed too.
      </p>
    </Dialog>
  );
};

const ExportDialog: Component<{
  templateIds?: Array<string>;
  onClose: () => void;
}> = (props) => {
  // Read once: the export is a snapshot taken when the dialog opens.
  const ids = untrack(() => props.templateIds);
  const text = exportSavedTypes(ids);
  const count = ids?.length ?? nodeflowData.templates.size;
  const [copied, setCopied] = createSignal(false);
  let area: HTMLTextAreaElement | undefined;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard access (e.g. not a secure context): use the selection.
      area?.select();
      document.execCommand("copy");
    }
    setCopied(true);
  };

  return (
    <Dialog
      title={count === 1 ? "Export saved type" : `Export ${count} saved types`}
      onClose={props.onClose}
      actions={
        <>
          <button
            type="button"
            class={appCss.toolbarButton}
            onClick={props.onClose}
          >
            Close
          </button>
          <button
            type="button"
            class={`${appCss.toolbarButton} ${appCss.primaryButton}`}
            onClick={copy}
          >
            {copied() ? "Copied" : "Copy"}
          </button>
        </>
      }
    >
      <textarea
        ref={area}
        class={appCss.dialogText}
        readOnly
        value={text}
        aria-label="Export string"
        onFocus={(event) => event.currentTarget.select()}
      />
      <p class={appCss.dialogNote}>
        Paste this into Import, here or in another browser, to add the{" "}
        {count === 1 ? "type" : "types"} there.
      </p>
    </Dialog>
  );
};

const ImportDialog: Component<{ onClose: () => void }> = (props) => {
  const [text, setText] = createSignal("");
  const [error, setError] = createSignal("");

  const submit = () => {
    try {
      const { added, skipped } = importSavedTypes(text());
      if (added.length === 0) {
        setError(
          `Already saved: ${skipped} ${skipped === 1 ? "type" : "types"}.`,
        );
        return;
      }
      props.onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  };

  return (
    <Dialog
      title="Import saved types"
      onClose={props.onClose}
      actions={
        <>
          <button
            type="button"
            class={appCss.toolbarButton}
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            class={`${appCss.toolbarButton} ${appCss.primaryButton}`}
            disabled={text().trim() === ""}
            onClick={submit}
          >
            Import
          </button>
        </>
      }
    >
      <textarea
        class={appCss.dialogText}
        value={text()}
        placeholder="Paste an export string"
        aria-label="Export string to import"
        onInput={(event) => {
          setText(event.currentTarget.value);
          setError("");
        }}
      />
      <Show when={error()}>
        <p class={appCss.dialogError} role="alert">
          {error()}
        </p>
      </Show>
    </Dialog>
  );
};

/** Rename, export and import dialogs for saved derived types. */
const SavedTypeDialogs: Component<{
  dialog: SavedTypeDialogState;
  onClose: () => void;
}> = (props) => (
  <Switch>
    <Match when={props.dialog.kind === "rename" && props.dialog} keyed>
      {(dialog) => (
        <RenameDialog templateId={dialog.templateId} onClose={props.onClose} />
      )}
    </Match>
    <Match when={props.dialog.kind === "export" && props.dialog} keyed>
      {(dialog) => (
        <ExportDialog
          templateIds={dialog.templateIds}
          onClose={props.onClose}
        />
      )}
    </Match>
    <Match when={props.dialog.kind === "import"}>
      <ImportDialog onClose={props.onClose} />
    </Match>
  </Switch>
);

export default SavedTypeDialogs;
