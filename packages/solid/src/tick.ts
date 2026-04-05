import { createSignal, onCleanup } from "solid-js";

/**
 * Creates a reactive tick signal that increments every animation frame.
 * Components that read tick() will re-evaluate their memos each frame,
 * allowing them to pick up changes from the imperative core.
 */
export const createTick = (): (() => number) => {
  const [tick, setTick] = createSignal(0);
  let rafId: number;
  let running = true;

  const loop = () => {
    if (!running) return;
    setTick((t) => t + 1);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);

  onCleanup(() => {
    running = false;
    cancelAnimationFrame(rafId);
  });

  return tick;
};
