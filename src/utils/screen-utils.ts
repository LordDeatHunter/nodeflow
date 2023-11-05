import { createEffect, createSignal } from "solid-js";
import { Size } from "./size";

export const [windowSize, setWindowSize] = createSignal<Size>(
  new Size(window.innerWidth, window.innerHeight),
);

createEffect(() => {
  const onResize = () =>
    setWindowSize(new Size(window.innerWidth, window.innerHeight));
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
