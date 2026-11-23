import { describe, it, expect, vi, afterEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import NodeflowRegistry from "../src/NodeflowRegistry";
import Vec2 from "../src/Vec2";
import { SelectableElementType } from "../src/nodeflow-types";

let testId = 0;
let canvas: NodeflowData | undefined;

const createCanvas = () => {
  canvas = NodeflowRegistry.get().createCanvas(`test-content-changed-${++testId}`);
  return canvas;
};

const addConnectedPair = (c: NodeflowData) => {
  const source = c.addNode(
    {
      id: "a",
      connectorSections: { out: { id: "out", connectors: { o: { id: "o" } } } },
    },
    false,
  );
  const destination = c.addNode(
    {
      id: "b",
      connectorSections: { in: { id: "in", connectors: { i: { id: "i" } } } },
    },
    false,
  );
  return { source, destination };
};

const listen = (c: NodeflowData) => {
  const listener = vi.fn();
  c.eventStore.onContentChanged.subscribe("test", listener);
  return listener;
};

afterEach(() => {
  if (canvas) NodeflowRegistry.get().removeNodeflow(canvas.id);
  canvas = undefined;
});

describe("onContentChanged", () => {
  it("publishes when nodes are added and removed", () => {
    const c = createCanvas();
    const listener = listen(c);

    c.addNode({ id: "n" }, false);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    c.removeNode("n", false);
    expect(listener).toHaveBeenCalled();
  });

  it("publishes when a node moves or is measured", () => {
    const c = createCanvas();
    const node = c.addNode({ id: "n" }, false);
    const listener = listen(c);

    node.position = Vec2.of(10, 10);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    node.updateMeasurements(Vec2.of(100, 50), Vec2.zero());
    expect(listener).toHaveBeenCalled();
  });

  it("publishes when a connector is measured", () => {
    const c = createCanvas();
    const { source } = addConnectedPair(c);
    const listener = listen(c);

    source.getConnector("o")!.updateMeasurements(Vec2.of(4, 4), Vec2.of(8, 8));
    expect(listener).toHaveBeenCalled();
  });

  it("publishes when connections are added and removed", () => {
    const c = createCanvas();
    addConnectedPair(c);
    const listener = listen(c);

    const connection = {
      sourceNodeId: "a",
      sourceConnectorId: "o",
      destinationNodeId: "b",
      destinationConnectorId: "i",
    };

    c.addConnection(connection, false);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    c.removeConnection("a", "o", "b", "i", false);
    expect(listener).toHaveBeenCalled();
  });

  it("publishes when the selection changes", () => {
    const c = createCanvas();
    const node = c.addNode({ id: "n" }, false);
    const listener = listen(c);

    c.mouseData.selections.add({ type: SelectableElementType.Node, node });
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    c.mouseData.selections.clear();
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    c.mouseData.reset();
    expect(listener).toHaveBeenCalled();
  });

  it("does not publish when only the canvas pans", () => {
    const c = createCanvas();
    c.addNode({ id: "n" }, false);
    const listener = listen(c);

    c.position = Vec2.of(100, 100);
    c.zoomLevel = 2;
    expect(listener).not.toHaveBeenCalled();
  });
});
