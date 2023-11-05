import { createEffect, createSignal } from "solid-js";
import { Size } from "../drawflow-types";

export const [windowSize, setWindowSize] = createSignal<Size>({
  width: window.innerWidth,
  height: window.innerHeight,
});

createEffect(() => {
  const onResize = () => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
});
