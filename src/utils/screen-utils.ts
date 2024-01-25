import { createEffect, createSignal } from "solid-js";
import Vec2 from "./data/Vec2";

/**
 * A Solid signal that contains the current window size.
 */
export const [windowSize, setWindowSize] = createSignal<Vec2>(
  Vec2.of(window.innerWidth, window.innerHeight),
);

/**
 * A Solid effect that updates the window size signal when the window is resized.
 */
createEffect(() => {
  const onResize = () =>
    setWindowSize(Vec2.of(window.innerWidth, window.innerHeight));
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
