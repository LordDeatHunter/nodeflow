import { describe, it, expect, vi, afterEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import NodeflowRegistry from "../src/NodeflowRegistry";
import Vec2 from "../src/Vec2";

let testId = 0;
let canvas: NodeflowData | undefined;

const createCanvas = () => {
  canvas = NodeflowRegistry.get().createCanvas(`test-transform-events-${++testId}`);
  return canvas;
};

afterEach(() => {
  if (canvas) NodeflowRegistry.get().removeNodeflow(canvas.id);
  canvas = undefined;
});

describe("onCanvasTransformChanged", () => {
  it("publishes when position or zoom is set directly", () => {
    const c = createCanvas();
    const listener = vi.fn();
    c.eventStore.onCanvasTransformChanged.subscribe("test", listener);

    c.position = Vec2.of(100, 50);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].position).toEqual({ x: 100, y: 50 });

    c.zoomLevel = 2;
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not publish when the transform is unchanged", () => {
    const c = createCanvas();
    const listener = vi.fn();
    c.eventStore.onCanvasTransformChanged.subscribe("test", listener);

    c.position = Vec2.zero();
    c.update({ currentMoveSpeed: Vec2.of(1, 1) });
    expect(listener).not.toHaveBeenCalled();
  });

  it("publishes when the background is panned", () => {
    const c = createCanvas();
    c.mouseData.selectNodeflow();
    const listener = vi.fn();
    c.eventStore.onCanvasTransformChanged.subscribe("test", listener);

    c.updateBackgroundPosition(Vec2.of(5, 5), true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
