import { NodeflowData } from "@nodeflow-lib/solid";
import { GRID_SIZE } from "./settings";

/** Major grid lines are drawn every this many minor cells. */
const MAJOR_EVERY = 5;
const DOT_RADIUS = 1.1;

// Below these on-screen spacings a grid level is too dense to read (and too
// costly to draw), so it fades out between the two values.
const DOTS_FADE = { hidden: 7, full: 14 };
const LINES_FADE = { hidden: 10, full: 24 };

interface GridColors {
  dot: string;
  line: string;
  glow: string;
  vignette: string;
}

const readColors = (element: HTMLElement): GridColors => {
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    dot: read("--grid-dot-color"),
    line: read("--grid-line-color"),
    glow: read("--grid-glow-color"),
    vignette: read("--grid-vignette-color"),
  };
};

/**
 * `color` at zero alpha. Canvas gradients fade towards "transparent" as
 * transparent black, which darkens a light color on the way.
 */
const clear = (color: string) => {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return rgb ? `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, 0)` : "transparent";
};

/** 0 when `spacing` is at or below `hidden`, 1 at or above `full`. */
const fade = (spacing: number, { hidden, full }: typeof DOTS_FADE) =>
  Math.min(1, Math.max(0, (spacing - hidden) / (full - hidden)));

/** The first multiple of `step` past `offset` that is at or after 0. */
const firstLine = (offset: number, step: number) =>
  offset - Math.floor(offset / step) * step;

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  colors: GridColors,
  width: number,
  height: number,
  originX: number,
  originY: number,
  scale: number,
  pixelRatio: number,
) => {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Lines and dots sit on device pixels so they stay crisp.
  const snap = (value: number) => Math.round(value * pixelRatio) / pixelRatio;

  const minor = GRID_SIZE * scale;
  const major = minor * MAJOR_EVERY;

  const linesAlpha = fade(major, LINES_FADE);
  if (linesAlpha > 0) {
    ctx.globalAlpha = linesAlpha;
    ctx.fillStyle = colors.line;
    for (let x = firstLine(originX, major); x < width; x += major) {
      ctx.fillRect(snap(x), 0, 1, height);
    }
    for (let y = firstLine(originY, major); y < height; y += major) {
      ctx.fillRect(0, snap(y), width, 1);
    }
  }

  const dotsAlpha = fade(minor, DOTS_FADE);
  if (dotsAlpha > 0) {
    ctx.globalAlpha = dotsAlpha;
    ctx.fillStyle = colors.dot;
    ctx.beginPath();
    const startX = firstLine(originX, minor);
    for (let y = firstLine(originY, minor); y < height + minor; y += minor) {
      const dotY = snap(y);
      for (let x = startX; x < width + minor; x += minor) {
        const dotX = snap(x);
        ctx.moveTo(dotX + DOT_RADIUS, dotY);
        ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A soft key light near the top, then a vignette, both over the grid.
  const glowX = width / 2;
  const glowY = height * 0.32;
  const glowReach = Math.hypot(Math.max(glowX, width - glowX), height - glowY);
  const glow = ctx.createRadialGradient(
    glowX,
    glowY,
    0,
    glowX,
    glowY,
    glowReach,
  );
  glow.addColorStop(0, colors.glow);
  glow.addColorStop(0.62, clear(colors.glow));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // An ellipse with the canvas's proportions reaching its corners, as in a
  // CSS `radial-gradient(ellipse at center, ...)`.
  const radiusX = (width / 2) * Math.SQRT2;
  const radiusY = (height / 2) * Math.SQRT2;
  ctx.translate(width / 2, height / 2);
  ctx.scale(1, radiusY / radiusX);
  const vignette = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  vignette.addColorStop(0.42, clear(colors.vignette));
  vignette.addColorStop(1, colors.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(-radiusX, -radiusX, radiusX * 2, radiusX * 2);
};

/**
 * Draws a canvas's background grid so it follows panning and zooming, and
 * snapped nodes sit on the drawn grid. Each frame it reads where the
 * transformed layer's origin (canvas-space 0,0) lands on screen and redraws
 * a viewport-sized <canvas> behind the nodes when that, the zoom or the size
 * changed. Drawing it there, instead of as CSS gradients sized by the zoom,
 * keeps the cost the same at any zoom level. Colors come from the
 * `--grid-*-color` properties on the nodeflow element. Returns a function
 * that stops syncing and removes the grid.
 */
export const syncBackgroundGrid = (nodeflow: NodeflowData): (() => void) => {
  let frame = 0;
  let lastKey = "";
  let grid: HTMLCanvasElement | undefined;
  let ctx: CanvasRenderingContext2D | null = null;
  let colors: GridColors | undefined;

  const sync = () => {
    frame = requestAnimationFrame(sync);

    const root = document.getElementById(`nodeflow-${nodeflow.id}`);
    const layer = root?.querySelector(":scope > div");
    if (!root || !layer) return;

    if (!grid || grid.parentElement !== root) {
      grid?.remove();
      grid = document.createElement("canvas");
      grid.setAttribute("aria-hidden", "true");
      // No offsets: it sits at its static position, the top-left of the
      // nodeflow element, without that element needing to be positioned.
      Object.assign(grid.style, {
        position: "absolute",
        pointerEvents: "none",
      });
      root.prepend(grid);
      ctx = grid.getContext("2d");
      colors = readColors(root);
      lastKey = "";
    }
    if (!ctx || !colors) return;

    const rootRect = root.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const x = layerRect.left - rootRect.left - root.clientLeft;
    const y = layerRect.top - rootRect.top - root.clientTop;
    const width = root.clientWidth;
    const height = root.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const scale = nodeflow.zoomLevel;

    const key = `${x}:${y}:${scale}:${width}:${height}:${pixelRatio}`;
    if (key === lastKey) return;
    lastKey = key;

    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (grid.width !== pixelWidth || grid.height !== pixelHeight) {
      grid.width = pixelWidth;
      grid.height = pixelHeight;
      grid.style.width = `${width}px`;
      grid.style.height = `${height}px`;
    }

    drawGrid(ctx, colors, width, height, x, y, scale, pixelRatio);
  };

  frame = requestAnimationFrame(sync);
  return () => {
    cancelAnimationFrame(frame);
    grid?.remove();
  };
};
