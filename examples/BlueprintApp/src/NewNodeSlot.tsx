import { Component, JSX, Show } from "solid-js";
import appCss from "./styles/app.module.scss";

const NewNodeSlot: Component<{
  children: JSX.Element;
  onClick: (event: PointerEvent) => void;
  /** Marks a saved derived-node type. */
  saved?: boolean;
  onRemove?: () => void;
}> = (props) => (
  <div
    class={appCss.paletteSlot}
    classList={{ [appCss.savedSlot]: props.saved }}
    onPointerDown={(event) => props.onClick(event)}
  >
    <Show when={props.saved}>
      <span class={appCss.slotTag}>Saved type</span>
    </Show>
    {props.children}
    <Show when={props.onRemove}>
      <button
        type="button"
        class={appCss.slotRemove}
        title="Delete saved type"
        aria-label="Delete saved type"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => props.onRemove?.()}
      >
        ×
      </button>
    </Show>
  </div>
);

export default NewNodeSlot;
