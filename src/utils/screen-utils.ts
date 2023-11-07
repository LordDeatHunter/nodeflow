import { createEffect, createSignal } from "solid-js";
import { Vec2 } from "./vec2";

export const [windowSize, setWindowSize] = createSignal<Vec2>(
  new Vec2(window.innerWidth, window.innerHeight),
);

createEffect(() => {
  const onResize = () =>
    setWindowSize(new Vec2(window.innerWidth, window.innerHeight));
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
