import { Component, JSX, onCleanup, Show } from "solid-js";
import appCss from "./styles/app.module.scss";

const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;

const NewNodeSlot: Component<{
  children: JSX.Element;
  onClick: (event: PointerEvent) => void;
  /** Right-click, or a long press on touch screens. */
  onContextMenu: (x: number, y: number) => void;
  /** Marks a saved derived-node type. */
  saved?: boolean;
  /** Greys the slot out: it can't be dragged and has no menu. */
  disabled?: boolean;
  disabledReason?: string;
  onRemove?: () => void;
}> = (props) => {
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let pressStart = { x: 0, y: 0 };

  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressTimer = undefined;
  };
  onCleanup(cancelPress);

  return (
    <div
      class={appCss.paletteSlot}
      classList={{
        [appCss.savedSlot]: props.saved,
        [appCss.disabledSlot]: props.disabled,
      }}
      title={props.disabled ? props.disabledReason : undefined}
      aria-disabled={props.disabled}
      onPointerDown={(event) => {
        // Only the primary button drags a node out.
        if (event.button !== 0 || props.disabled) return;
        props.onClick(event);

        if (event.pointerType === "mouse") return;
        pressStart = { x: event.clientX, y: event.clientY };
        cancelPress();
        pressTimer = setTimeout(() => {
          pressTimer = undefined;
          props.onContextMenu(pressStart.x, pressStart.y);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(event) => {
        if (pressTimer === undefined) return;
        const moved = Math.hypot(
          event.clientX - pressStart.x,
          event.clientY - pressStart.y,
        );
        if (moved > LONG_PRESS_SLOP) cancelPress();
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => {
        event.preventDefault();
        if (props.disabled) return;
        // Touch long presses are handled by the timer above.
        if (pressTimer !== undefined) return;
        props.onContextMenu(event.clientX, event.clientY);
      }}
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
};

export default NewNodeSlot;
