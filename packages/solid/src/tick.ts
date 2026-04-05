import { createSignal, onCleanup } from "solid-js";

/**
 * Creates a reactive tick signal that increments on animation frames only when dirty.
 * The rAF loop stops when idle (no interaction) and restarts when markDirty() is called.
 * Components that read tick() will re-evaluate their memos each active frame,
 * allowing them to pick up changes from the imperative core.
 */
export const createTick = (): { tick: () => number; markDirty: () => void } => {
  const [tick, setTick] = createSignal(0);
  let rafId: number | null = null;
  let dirty = true;
  let running = true;

  const loop = () => {
    if (!dirty) {
      rafId = null;
      return; // Stop the loop — will restart when markDirty() is called
    }
    dirty = false;
    setTick((t) => t + 1);
    rafId = requestAnimationFrame(loop);
  };

  const markDirty = () => {
    dirty = true;
    if (rafId === null && running) {
      rafId = requestAnimationFrame(loop);
    }
  };

  rafId = requestAnimationFrame(loop);

  onCleanup(() => {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  return { tick, markDirty };
};
