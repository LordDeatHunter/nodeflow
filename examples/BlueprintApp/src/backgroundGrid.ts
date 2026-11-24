import { NodeflowData } from "@nodeflow-lib/solid";

/**
 * Keeps a canvas's background grid aligned with the panned/zoomed canvas, so
 * snapped nodes sit on the drawn grid. Reads where the transformed layer's
 * origin (canvas-space 0,0) lands on screen each frame and exposes it, plus
 * the zoom level, as CSS variables used by nodeflow.module.scss. Returns a
 * function that stops syncing.
 */
export const syncBackgroundGrid = (nodeflow: NodeflowData): (() => void) => {
  let frame = 0;
  let lastKey = "";

  const sync = () => {
    frame = requestAnimationFrame(sync);

    const canvas = document.getElementById(`nodeflow-${nodeflow.id}`);
    const layer = canvas?.firstElementChild;
    if (!canvas || !layer) return;

    const canvasRect = canvas.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const x = layerRect.left - canvasRect.left - canvas.clientLeft;
    const y = layerRect.top - canvasRect.top - canvas.clientTop;
    const scale = nodeflow.zoomLevel;

    const key = `${x}:${y}:${scale}`;
    if (key === lastKey) return;
    lastKey = key;

    canvas.style.setProperty("--grid-x", `${x}px`);
    canvas.style.setProperty("--grid-y", `${y}px`);
    canvas.style.setProperty("--grid-scale", `${scale}`);
  };

  frame = requestAnimationFrame(sync);
  return () => cancelAnimationFrame(frame);
};
