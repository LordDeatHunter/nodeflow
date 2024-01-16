import { createEffect, createSignal } from "solid-js";
import Vec2 from "./data/Vec2";

export const [windowSize, setWindowSize] = createSignal<Vec2>(
  Vec2.of(window.innerWidth, window.innerHeight),
);

createEffect(() => {
  const onResize = () =>
    setWindowSize(Vec2.of(window.innerWidth, window.innerHeight));
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
