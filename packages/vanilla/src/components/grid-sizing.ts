import { NodeflowData, Vec2 } from "@nodeflow-lib/core";

/**
 * Grows a node element so its rendered box (border included) is a multiple
 * of `settings.gridSize` when `settings.snapNodeSizeToGrid` is on. The
 * previous minimum is cleared first so the element can shrink with its
 * content.
 */
export const applyGridSize = (el: HTMLElement, data: NodeflowData): void => {
  el.style.minWidth = "";
  el.style.minHeight = "";

  if (!data.settings.snapNodeSizeToGrid) return;

  const natural = Vec2.of(el.offsetWidth, el.offsetHeight);
  const snapped = data.snapSizeToGrid(natural);
  if (snapped.equals(natural)) return;

  // min-width/height apply to the content box unless box-sizing says
  // otherwise, so subtract padding and border in that case.
  const style = getComputedStyle(el);
  const extra =
    style.boxSizing === "border-box"
      ? Vec2.zero()
      : natural.subtract(
          Vec2.of(parseFloat(style.width), parseFloat(style.height)),
        );

  el.style.minWidth = `${snapped.x - extra.x}px`;
  el.style.minHeight = `${snapped.y - extra.y}px`;
};

/** A key that changes whenever the grid sizing settings change. */
export const gridSizingKey = (data: NodeflowData): string =>
  `${data.settings.snapNodeSizeToGrid}:${data.settings.gridSize}`;
