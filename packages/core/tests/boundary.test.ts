/**
 * Tests for the optional `nodeBoundary` / `viewBoundary` settings.
 *
 * Coordinate model: the visible canvas rect has top-left `-position` and size
 * `size / zoomLevel`, so a view boundary clamps `position` to
 * `[size / zoom - boundary.max, -boundary.min]` on each axis.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";
import { MOUSE_BUTTONS } from "../src/constants";
import { NodeflowSettings } from "../src/nodeflow-types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

const CANVAS_SIZE = Vec2.of(800, 600);
const CENTER = Vec2.of(400, 300);

/** 2000x2000 boundary from (-1000,-1000) to (1000,1000). */
const BOUNDARY = Rect.of(Vec2.of(-1000, -1000), Vec2.of(2000, 2000));

function createCanvas(
  settings: Partial<NodeflowSettings> = {},
  size: Vec2 = CANVAS_SIZE,
): NodeflowData {
  const canvas = new NodeflowData("boundary-canvas", settings);
  canvas.updateCanvasSize(size);
  canvas.update({ startPosition: Vec2.zero() });
  return canvas;
}

/** Visible canvas-space rectangle [min, max] of the current view. */
function visibleRect(canvas: NodeflowData): { min: Vec2; max: Vec2 } {
  const min = canvas.position.negate();
  return { min, max: min.add(canvas.size.divideBy(canvas.zoomLevel)) };
}

function expectViewInside(canvas: NodeflowData, boundary: Rect) {
  const view = visibleRect(canvas);
  const min = boundary.startPosition();
  const max = boundary.endPosition();
  expect(view.min.x).toBeGreaterThanOrEqual(min.x - 1e-6);
  expect(view.min.y).toBeGreaterThanOrEqual(min.y - 1e-6);
  expect(view.max.x).toBeLessThanOrEqual(max.x + 1e-6);
  expect(view.max.y).toBeLessThanOrEqual(max.y + 1e-6);
}

function selectCanvasForPan(canvas: NodeflowData) {
  canvas.mouseData.selectNodeflow();
  canvas.mouseData.heldMouseButtons.add(MOUSE_BUTTONS.MIDDLE);
}

describe("canvas boundaries", () => {
  let canvas: NodeflowData | undefined;

  afterEach(() => {
    canvas?.stopDragEdgeScroll();
    canvas = undefined;
  });

  describe("defaults (no boundary)", () => {
    it("leaves both boundaries undefined", () => {
      canvas = createCanvas();
      expect(canvas.settings.nodeBoundary).toBeUndefined();
      expect(canvas.settings.viewBoundary).toBeUndefined();
    });

    it("keeps the view infinite", () => {
      canvas = createCanvas();
      canvas.position = Vec2.of(99999, -99999);
      expect(canvas.position.x).toBe(99999);
      expect(canvas.position.y).toBe(-99999);

      canvas.updateZoom(-1e6, CENTER);
      expect(canvas.zoomLevel).toBe(canvas.settings.minZoom);
      expect(canvas.getEffectiveMinZoom()).toBe(canvas.settings.minZoom);
    });

    it("keeps node placement infinite", () => {
      canvas = createCanvas();
      const node = canvas.addNode(
        { id: "n1", position: { x: 50000, y: -50000 } },
        false,
      );
      expect(node.position.x).toBe(50000);
      expect(node.position.y).toBe(-50000);
      expect(node.getBoundaryTravel()).toBeUndefined();
    });

    it("does not publish a transform change on resize", () => {
      canvas = createCanvas();
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);
      canvas.updateCanvasSize(Vec2.of(1600, 1200));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("view boundary: panning", () => {
    it("clamps the raw position setter", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });

      canvas.position = Vec2.of(5000, 0);
      // -position.x must not go below boundary.min.x (-1000)
      expect(canvas.position.x).toBe(1000);

      canvas.position = Vec2.of(-5000, 0);
      // -position.x + size.x/zoom must not exceed boundary.max.x (1000)
      expect(canvas.position.x).toBe(800 - 1000);
    });

    it("clamps update({ position })", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      canvas.update({ position: Vec2.of(0, 5000) });
      expect(canvas.position.y).toBe(1000);
      canvas.update({ position: Vec2.of(0, -5000) });
      expect(canvas.position.y).toBe(600 - 1000);
    });

    it("stops mouse panning at the edge", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      selectCanvasForPan(canvas);

      for (let i = 0; i < 100; i++) {
        canvas.updateBackgroundPosition(Vec2.of(50, 50));
      }

      expect(canvas.position.x).toBe(1000);
      expect(canvas.position.y).toBe(1000);
      expectViewInside(canvas, BOUNDARY);
    });

    it("allows panning freely inside the boundary", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      selectCanvasForPan(canvas);
      canvas.updateBackgroundPosition(Vec2.of(-100, 40));
      expect(canvas.position.x).toBe(-100);
      expect(canvas.position.y).toBe(40);
    });
  });

  describe("view boundary: zoom", () => {
    it("reports the effective minimum zoom from viewport and boundary size", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      // max(800/2000, 600/2000) = 0.4
      expect(canvas.getEffectiveMinZoom()).toBeCloseTo(0.4, 10);
    });

    it("limits zooming out so the view never leaves the boundary", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });

      for (let i = 0; i < 50; i++) {
        canvas.updateZoom(-1e4, CENTER);
      }

      expect(canvas.zoomLevel).toBeCloseTo(0.4, 10);
      expectViewInside(canvas, BOUNDARY);
    });

    it("still fits when the effective minimum does not round to 4 decimals", () => {
      // 800 / 1500 = 0.5333...
      const boundary = Rect.of(Vec2.of(0, 0), Vec2.of(1500, 1500));
      canvas = createCanvas({ viewBoundary: boundary });

      for (let i = 0; i < 50; i++) {
        canvas.updateZoom(-1e4, CENTER);
      }

      expectViewInside(canvas, boundary);
      expect(canvas.size.x / canvas.zoomLevel).toBeLessThanOrEqual(1500 + 1e-9);
    });

    it("lets maxZoom win and centers the boundary when it is smaller than the viewport", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY, maxZoom: 0.3 });

      // Visible width at zoom 0.3 is 2666 > 2000, so the view can't fit.
      expect(canvas.zoomLevel).toBe(0.3);
      const view = visibleRect(canvas);
      const viewCenter = view.min.add(view.max).divideBy(2);
      expect(viewCenter.x).toBeCloseTo(BOUNDARY.center.x, 6);
      expect(viewCenter.y).toBeCloseTo(BOUNDARY.center.y, 6);
    });

    it("keeps the raw zoomLevel setter within the effective minimum", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      canvas.zoomLevel = 0.0001;
      expect(canvas.zoomLevel).toBeCloseTo(0.4, 10);
      expectViewInside(canvas, BOUNDARY);
    });

    it("skips zoom limiting while the canvas size is unmeasured", () => {
      canvas = new NodeflowData("unmeasured", { viewBoundary: BOUNDARY });
      expect(canvas.getEffectiveMinZoom()).toBe(canvas.settings.minZoom);

      canvas.zoomLevel = 0.05;
      expect(canvas.zoomLevel).toBe(0.05);

      // Position is still clamped to [-max, -min] = [-1000, 1000].
      canvas.position = Vec2.of(5000, -5000);
      expect(canvas.position.x).toBe(1000);
      expect(canvas.position.y).toBe(-1000);
    });
  });

  describe("view boundary: resize", () => {
    it("re-clamps and publishes when the viewport grows past the edge", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      canvas.position = Vec2.of(-200, 0); // right edge of the boundary
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);

      canvas.updateCanvasSize(Vec2.of(1600, 600));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(canvas.position.x).toBe(1600 - 1000);
      expectViewInside(canvas, BOUNDARY);
    });

    it("does not publish when nothing moved", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);
      canvas.updateCanvasSize(Vec2.of(700, 500));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("node boundary: placement", () => {
    it("clamps nodes added outside the boundary", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const far = canvas.addNode(
        { id: "far", position: { x: 5000, y: 5000 } },
        false,
      );
      // Size is 0 until measured, so the node pins to boundary.max.
      expect(far.position.x).toBe(1000);
      expect(far.position.y).toBe(1000);

      const near = canvas.addNode(
        { id: "near", position: { x: -5000, y: -5000 } },
        false,
      );
      expect(near.position.x).toBe(-1000);
      expect(near.position.y).toBe(-1000);
    });

    it("clamps programmatic position updates", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const node = canvas.addNode(
        { id: "n1", position: { x: 0, y: 0 } },
        false,
      );
      node.position = Vec2.of(3000, -3000);
      expect(node.position.x).toBe(1000);
      expect(node.position.y).toBe(-1000);

      node.update({ position: Vec2.of(-3000, 3000) });
      expect(node.position.x).toBe(-1000);
      expect(node.position.y).toBe(1000);
    });

    it("re-clamps once the node is measured, using size + 2 * offset", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const node = canvas.addNode(
        { id: "n1", position: { x: 990, y: 0 } },
        false,
      );
      expect(node.position.x).toBe(990);

      node.updateMeasurements(Vec2.of(100, 50), Vec2.of(1, 1));

      expect(node.position.x).toBe(1000 - 102);
      expect(node.position.y).toBe(0);
    });

    it("pins oversized nodes to the boundary's top-left corner", () => {
      const small = Rect.of(Vec2.of(100, 100), Vec2.of(100, 100));
      canvas = createCanvas({ nodeBoundary: small });
      const node = canvas.addNode(
        { id: "big", position: { x: 150, y: 150 } },
        false,
      );
      node.updateMeasurements(Vec2.of(300, 300), Vec2.zero());
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(100);
    });

    it("exposes the allowed travel range", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const node = canvas.addNode(
        { id: "n1", position: { x: 0, y: 0 } },
        false,
      );
      node.updateMeasurements(Vec2.of(100, 50), Vec2.of(2, 2));
      const travel = node.getBoundaryTravel()!;
      expect(travel.low.x).toBe(-1000);
      expect(travel.low.y).toBe(-1000);
      expect(travel.high.x).toBe(1000 - 104);
      expect(travel.high.y).toBe(1000 - 54);
    });

    it("keeps nodes inside the boundary when collision push-apart is on", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY, allowCollision: true });
      const a = canvas.addNode({ id: "a", position: { x: 900, y: 0 } }, false);
      const b = canvas.addNode({ id: "b", position: { x: 900, y: 0 } }, false);
      a.updateMeasurements(Vec2.of(100, 100), Vec2.zero());
      b.updateMeasurements(Vec2.of(100, 100), Vec2.zero());

      b.position = Vec2.of(950, 0);

      [a, b].forEach((node) => {
        expect(node.position.x).toBeGreaterThanOrEqual(-1000);
        expect(node.position.x + 100).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe("node boundary: dragging", () => {
    it("clamps a dragged node and returns the applied delta", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const node = canvas.addNode(
        { id: "n1", position: { x: 0, y: 0 } },
        false,
      );
      canvas.mouseData.selectNode("n1", CENTER, true);

      const applied = canvas.updateHeldNodePosition(Vec2.of(10000, 0));

      expect(node.position.x).toBe(1000);
      expect(applied.x).toBe(1000);
      expect(applied.y).toBe(0);
    });

    it("moves a multi-selection as a block and stops when the first node hits the edge", () => {
      const boundary = Rect.of(Vec2.of(0, 0), Vec2.of(600, 600));
      canvas = createCanvas({ nodeBoundary: boundary });
      const a = canvas.addNode({ id: "a", position: { x: 0, y: 0 } }, false);
      const b = canvas.addNode({ id: "b", position: { x: 500, y: 0 } }, false);
      canvas.mouseData.selectNode("a", CENTER, true);
      canvas.mouseData.selectNode("b", CENTER, true);
      expect(canvas.mouseData.heldNodes).toHaveLength(2);

      canvas.updateHeldNodePosition(Vec2.of(200, 0));
      expect(a.position.x).toBe(100);
      expect(b.position.x).toBe(600);

      canvas.updateHeldNodePosition(Vec2.of(-500, 0));
      expect(a.position.x).toBe(0);
      expect(b.position.x).toBe(500);
    });

    it("does not let an oversized node freeze the rest of the group", () => {
      const boundary = Rect.of(Vec2.of(0, 0), Vec2.of(600, 100));
      canvas = createCanvas({ nodeBoundary: boundary });
      const big = canvas.addNode(
        { id: "big", position: { x: 0, y: 0 } },
        false,
      );
      const small = canvas.addNode(
        { id: "small", position: { x: 0, y: 0 } },
        false,
      );
      big.updateMeasurements(Vec2.of(50, 300), Vec2.zero()); // taller than boundary
      canvas.mouseData.selectNode("big", CENTER, true);
      canvas.mouseData.selectNode("small", CENTER, true);

      canvas.updateHeldNodePosition(Vec2.of(0, 40));

      expect(big.position.y).toBe(0);
      expect(small.position.y).toBe(40);
    });

    it("stops edge auto-scroll on an axis where the node is pinned", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const node = canvas.addNode(
        { id: "n1", position: { x: 1000, y: 0 } },
        false,
      );
      canvas.mouseData.selectNode("n1", CENTER, true);
      canvas.mouseData.mousePosition = Vec2.of(820, 300); // right of the canvas

      canvas.handleDragEdgeScroll();

      expect(node.position.x).toBe(1000);
      expect(canvas.position.x).toBe(0);
    });
  });

  describe("updateSettings", () => {
    it("re-clamps nodes and view when boundaries are added, publishing once", () => {
      canvas = createCanvas();
      const node = canvas.addNode(
        { id: "n1", position: { x: 5000, y: 0 } },
        false,
      );
      canvas.position = Vec2.of(5000, 0);
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);

      canvas.updateSettings({ nodeBoundary: BOUNDARY, viewBoundary: BOUNDARY });

      expect(node.position.x).toBe(1000);
      expect(canvas.position.x).toBe(1000);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("publishes when a boundary is removed even if nothing moved", () => {
      canvas = createCanvas({ nodeBoundary: BOUNDARY });
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);

      canvas.updateSettings({ nodeBoundary: undefined });

      expect(canvas.settings.nodeBoundary).toBeUndefined();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not publish for unrelated settings changes", () => {
      canvas = createCanvas({ viewBoundary: BOUNDARY });
      const listener = vi.fn();
      canvas.eventStore.onCanvasTransformChanged.subscribe("test", listener);
      canvas.updateSettings({ canPan: false });
      expect(listener).not.toHaveBeenCalled();
    });

    it("supports the updater-function form", () => {
      canvas = createCanvas();
      canvas.updateSettings((prev) => ({
        nodeBoundary: prev.nodeBoundary ?? BOUNDARY,
      }));
      expect(canvas.settings.nodeBoundary).toBe(BOUNDARY);
    });
  });

  describe("deserialize", () => {
    it("clamps restored view and node positions", () => {
      const source = createCanvas();
      source.addNode({ id: "n1", position: { x: 5000, y: 5000 } }, false);
      source.position = Vec2.of(5000, 5000);
      const serialized = source.serialize();

      canvas = createCanvas({ nodeBoundary: BOUNDARY, viewBoundary: BOUNDARY });
      canvas.deserialize(serialized);

      expect(canvas.position.x).toBe(1000);
      expect(canvas.position.y).toBe(1000);
      expect(canvas.nodes.get("n1")!.position.x).toBe(1000);
      expectViewInside(canvas, BOUNDARY);
    });
  });

  describe("degenerate boundaries", () => {
    it("treats a zero-size view boundary as unbounded", () => {
      canvas = createCanvas({
        viewBoundary: Rect.of(Vec2.zero(), Vec2.zero()),
      });
      canvas.position = Vec2.of(5000, 5000);
      expect(canvas.position.x).toBe(5000);
      expect(canvas.getEffectiveMinZoom()).toBe(canvas.settings.minZoom);
    });

    it("normalizes a boundary built from reversed corners", () => {
      canvas = createCanvas({
        nodeBoundary: Rect.fromPositions(Vec2.of(1000, 1000), Vec2.of(-1000, -1000)),
      });
      const node = canvas.addNode(
        { id: "n1", position: { x: 5000, y: -5000 } },
        false,
      );
      expect(node.position.x).toBe(1000);
      expect(node.position.y).toBe(-1000);
    });
  });
});
