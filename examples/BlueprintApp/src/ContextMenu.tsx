import { Component, For, onCleanup, onMount } from "solid-js";
import appCss from "./styles/app.module.scss";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

const MENU_WIDTH = 184;
const ITEM_HEIGHT = 38;

/** A small floating menu that closes on an outside press or Escape. */
const ContextMenu: Component<{
  x: number;
  y: number;
  title: string;
  items: Array<ContextMenuItem>;
  onClose: () => void;
}> = (props) => {
  let menu: HTMLDivElement | undefined;

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menu?.contains(event.target as Node)) props.onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    });
    menu?.querySelector("button")?.focus();
  });

  // Keep the menu on screen, e.g. when opened near the bottom palette.
  const left = () =>
    Math.max(8, Math.min(props.x + 4, window.innerWidth - MENU_WIDTH - 8));
  const top = () => {
    const height = 40 + props.items.length * ITEM_HEIGHT;
    return Math.max(8, Math.min(props.y + 4, window.innerHeight - height - 8));
  };

  return (
    <div
      ref={menu}
      role="menu"
      class={appCss.contextMenu}
      style={{ left: `${left()}px`, top: `${top()}px` }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div class={appCss.contextMenuTitle}>{props.title}</div>
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            role="menuitem"
            class={appCss.contextMenuItem}
            classList={{ [appCss.contextMenuDanger]: item.danger }}
            onClick={() => {
              props.onClose();
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        )}
      </For>
    </div>
  );
};

export default ContextMenu;
