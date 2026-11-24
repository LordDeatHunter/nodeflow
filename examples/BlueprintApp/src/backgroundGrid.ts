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

/**
 * A repeating fill with one dot per `spacing` CSS pixels. The dot is drawn
 * once on a small tile that is rebuilt only when the spacing changes; each
 * frame then fills the canvas with it in a single call, however many dots
 * are on screen.
 */
class DotPattern {
  private tile = document.createElement("canvas");
  private pattern: CanvasPattern | null = null;
  private key = "";

  /** The pattern for `spacing`, positioned so dots land on the origin. */
  get(
    ctx: CanvasRenderingContext2D,
    color: string,
    spacing: number,
    originX: number,
    originY: number,
    pixelRatio: number,
  ): CanvasPattern | null {
    // Tiles are whole device pixels; the pattern transform stretches them by
    // under a pixel to the exact spacing so dots do not drift.
    const size = Math.max(1, Math.round(spacing * pixelRatio));
    const key = `${size}:${color}:${pixelRatio}`;
    if (key !== this.key) {
      this.key = key;
      this.tile.width = size;
      this.tile.height = size;
      const tileCtx = this.tile.getContext("2d");
      if (!tileCtx) return null;
      tileCtx.fillStyle = color;
      tileCtx.beginPath();
      tileCtx.arc(size / 2, size / 2, DOT_RADIUS * pixelRatio, 0, Math.PI * 2);
      tileCtx.fill();
      this.pattern = ctx.createPattern(this.tile, "repeat");
    }
    if (!this.pattern) return null;

    const stretch = (spacing * pixelRatio) / size;
    const half = (spacing * pixelRatio) / 2;
    this.pattern.setTransform(
      new DOMMatrix()
        .translate(originX * pixelRatio - half, originY * pixelRatio - half)
        .scale(stretch),
    );
    return this.pattern;
  }
}

/**
 * The key light and vignette, which depend only on the canvas size, drawn
 * once per size and then copied over the grid each frame.
 */
class Lighting {
  private canvas = document.createElement("canvas");
  private key = "";

  get(colors: GridColors, pixelWidth: number, pixelHeight: number) {
    const key = `${pixelWidth}:${pixelHeight}`;
    if (key === this.key) return this.canvas;
    this.key = key;
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return this.canvas;
    const width = pixelWidth;
    const height = pixelHeight;

    // A soft key light near the top...
    const glowX = width / 2;
    const glowY = height * 0.32;
    const glowReach = Math.hypot(
      Math.max(glowX, width - glowX),
      height - glowY,
    );
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

    // ...then a vignette: an ellipse with the canvas's proportions reaching
    // its corners, as in a CSS `radial-gradient(ellipse at center, ...)`.
    const radiusX = (width / 2) * Math.SQRT2;
    const radiusY = (height / 2) * Math.SQRT2;
    ctx.translate(width / 2, height / 2);
    ctx.scale(1, radiusY / radiusX);
    const vignette = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    vignette.addColorStop(0.42, clear(colors.vignette));
    vignette.addColorStop(1, colors.vignette);
    ctx.fillStyle = vignette;
    ctx.fillRect(-radiusX, -radiusX, radiusX * 2, radiusX * 2);
    return this.canvas;
  }
}

interface GridView {
  width: number;
  height: number;
  originX: number;
  originY: number;
  scale: number;
  pixelRatio: number;
}

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  colors: GridColors,
  dots: DotPattern,
  lighting: Lighting,
  { width, height, originX, originY, scale, pixelRatio }: GridView,
) => {
  const pixelWidth = ctx.canvas.width;
  const pixelHeight = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, pixelWidth, pixelHeight);

  const minor = GRID_SIZE * scale;
  const major = minor * MAJOR_EVERY;

  const linesAlpha = fade(major, LINES_FADE);
  if (linesAlpha > 0) {
    // Lines sit on device pixels so they stay crisp.
    const line = Math.max(1, Math.round(pixelRatio));
    ctx.globalAlpha = linesAlpha;
    ctx.fillStyle = colors.line;
    for (let x = firstLine(originX, major); x < width; x += major) {
      ctx.fillRect(Math.round(x * pixelRatio), 0, line, pixelHeight);
    }
    for (let y = firstLine(originY, major); y < height; y += major) {
      ctx.fillRect(0, Math.round(y * pixelRatio), pixelWidth, line);
    }
  }

  const dotsAlpha = fade(minor, DOTS_FADE);
  const pattern =
    dotsAlpha > 0 &&
    dots.get(ctx, colors.dot, minor, originX, originY, pixelRatio);
  if (pattern) {
    ctx.globalAlpha = dotsAlpha;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  }

  ctx.globalAlpha = 1;
  ctx.drawImage(lighting.get(colors, pixelWidth, pixelHeight), 0, 0);
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
  const dots = new DotPattern();
  const lighting = new Lighting();

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

    drawGrid(ctx, colors, dots, lighting, {
      width,
      height,
      originX: x,
      originY: y,
      scale,
      pixelRatio,
    });
  };

  frame = requestAnimationFrame(sync);
  return () => {
    cancelAnimationFrame(frame);
    grid?.remove();
  };
};
