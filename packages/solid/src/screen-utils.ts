import { createSignal } from "solid-js";
import { Vec2 } from "@nodeflow/core";

const readWindowSize = (): Vec2 =>
  Vec2.of(
    window.visualViewport?.width ?? window.innerWidth,
    window.visualViewport?.height ?? window.innerHeight,
  );

/**
 * A Solid signal that contains the current window size.
 */
export const [windowSize, setWindowSize] = createSignal<Vec2>(
  readWindowSize(),
);

const updateWindowSize = () => setWindowSize(readWindowSize());

window.addEventListener("resize", updateWindowSize);
window.addEventListener("orientationchange", updateWindowSize);
window.visualViewport?.addEventListener("resize", updateWindowSize);
