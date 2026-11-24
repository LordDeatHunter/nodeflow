import { Component, JSX, onCleanup, onMount } from "solid-js";
import appCss from "./styles/app.module.scss";

/** A small modal: closes on Escape or a press on the backdrop. */
const Dialog: Component<{
  title: string;
  onClose: () => void;
  children: JSX.Element;
  actions: JSX.Element;
}> = (props) => {
  let panel: HTMLDivElement | undefined;

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Don't also cancel the type editor underneath.
      event.stopImmediatePropagation();
      props.onClose();
    };
    // Capture phase, so it runs before the editor's own Escape handler.
    document.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown, true));
    panel?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  });

  return (
    <div
      class={appCss.dialogBackdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        ref={panel}
        class={appCss.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        // Keep typing out of the canvases' keyboard shortcuts.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <h2 class={appCss.dialogTitle}>{props.title}</h2>
        {props.children}
        <div class={appCss.dialogActions}>{props.actions}</div>
      </div>
    </div>
  );
};

export default Dialog;
