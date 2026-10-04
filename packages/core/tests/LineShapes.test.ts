import { describe, it, expect, beforeEach } from "vitest";
import Vec2 from "../src/Vec2";
import CurveFunctions from "../src/CurveFunctions";
import NodeflowData from "../src/NodeflowData";
import {
  builtInLineShapes,
  createLinePath,
  getLineDashArray,
  getLineShapeGenerator,
  registerLineShape,
  unregisterLineShape,
  type LineShapeContext,
} from "../src/LineShapes";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

const context = (
  start: [number, number],
  end: [number, number],
  anchorStart = start,
  anchorEnd = end,
): LineShapeContext => {
  const startVec = Vec2.of(...start);
  const endVec = Vec2.of(...end);
  return {
    start: startVec,
    end: endVec,
    anchorStart: Vec2.of(...anchorStart),
    anchorEnd: Vec2.of(...anchorEnd),
    startNodeCenter: startVec,
    endNodeCenter: endVec,
  };
};

function addNodeWithConnector(
  canvas: NodeflowData,
  nodeId: string,
  position = { x: 0, y: 0 },
) {
  return canvas.addNode(
    {
      id: nodeId,
      position,
      connectorSections: {
        s0: {
          id: "s0",
          connectors: {
            c0: { id: "c0", hovered: false, position: { x: 0, y: 0 } },
          },
        },
      },
    },
    false,
  );
}

describe("LineShapes", () => {
  describe("curved", () => {
    it("emits a cubic bezier anchored at the provided points", () => {
      const path = createLinePath(
        "curved",
        context([0, 0], [100, 50], [10, 0], [90, 50]),
      );

      expect(path).toBe("M 0 0 C 10 0, 90 50, 100 50");
    });
  });

  describe("straight", () => {
    it("ignores anchors and connects start directly to end", () => {
      const path = createLinePath(
        "straight",
        context([0, 0], [100, 50], [500, 500], [-500, -500]),
      );

      expect(path).toBe("M 0 0 L 100 50");
    });
  });

  describe("broken-flat-line", () => {
    it("breaks horizontally when the x delta dominates", () => {
      const path = createLinePath("broken-flat-line", context([0, 0], [100, 50]));

      expect(path).toBe("M 0 0 L 50 0 L 50 50 L 100 50");
    });

    it("breaks vertically when the y delta dominates", () => {
      const path = createLinePath("broken-flat-line", context([0, 0], [20, 100]));

      expect(path).toBe("M 0 0 L 0 50 L 20 50 L 20 100");
    });

    it("always ends exactly at the destination", () => {
      const path = createLinePath("broken-flat-line", context([7, 3], [90, 40]));

      expect(path.endsWith("L 90 40")).toBe(true);
    });
  });

  describe("registry", () => {
    it("resolves every built-in shape", () => {
      for (const shape of Object.keys(builtInLineShapes)) {
        expect(getLineShapeGenerator(shape)).toBeDefined();
      }
    });

    it("falls back to the curved generator for unknown shapes", () => {
      expect(getLineShapeGenerator("does-not-exist")).toBe(
        builtInLineShapes.curved,
      );
    });

    it("treats elbow aliases as the broken-flat-line shape", () => {
      expect(getLineShapeGenerator("elbow")).toBe(
        builtInLineShapes["broken-flat-line"],
      );
      expect(getLineShapeGenerator("broken-elbow")).toBe(
        builtInLineShapes["broken-flat-line"],
      );
    });

    it("lets custom shapes be registered and used per connection", () => {
      registerLineShape("test-arc", ({ start, end }) => `M ${start.x} ${start.y} Q 5 5 ${end.x} ${end.y}`);

      expect(createLinePath("test-arc", context([0, 0], [10, 10]))).toBe(
        "M 0 0 Q 5 5 10 10",
      );

      expect(unregisterLineShape("test-arc")).toBe(true);
      expect(unregisterLineShape("test-arc")).toBe(false);
    });
  });

  describe("dash patterns", () => {
    it("maps dash names to stroke-dasharray values", () => {
      expect(getLineDashArray("solid")).toBeUndefined();
      expect(getLineDashArray("dashed")).toBe("8 6");
      expect(getLineDashArray("dotted")).toBe("2 5");
    });
  });

  describe("CurveFunctions.createPathForShape", () => {
    const curveFunctions = new CurveFunctions({});

    it("returns anchors and a path for a straight line", () => {
      const { anchorStart, anchorEnd, path } = curveFunctions.createPathForShape(
        "straight",
        Vec2.of(0, 0),
        Vec2.of(10, 10),
        Vec2.of(0, 0),
        Vec2.of(10, 10),
      );

      expect(path).toBe("M 0 0 L 10 10");
      expect(anchorStart).toBeInstanceOf(Vec2);
      expect(anchorEnd).toBeInstanceOf(Vec2);
    });
  });
});

describe("connection line style", () => {
  let canvas: NodeflowData;

  beforeEach(() => {
    canvas = new NodeflowData("line-style-canvas");
  });

  it("defaults to the curved, solid line style", () => {
    expect(canvas.settings.defaultLineShape).toBe("curved");
    expect(canvas.settings.defaultLineDash).toBe("solid");
  });

  it("stores per-connection shape and dash overrides", () => {
    addNodeWithConnector(canvas, "src");
    addNodeWithConnector(canvas, "dst", { x: 100, y: 100 });

    canvas.addConnection(
      {
        sourceNodeId: "src",
        sourceConnectorId: "c0",
        destinationNodeId: "dst",
        destinationConnectorId: "c0",
        shape: "broken-flat-line",
        dash: "dashed",
      },
      false,
    );

    const destination = canvas.nodes.get("src")!.getConnector("c0")!.destinations.get(0)!;
    expect(destination.shape).toBe("broken-flat-line");
    expect(destination.dash).toBe("dashed");
  });

  it("round-trips shape and dash through serialization", () => {
    addNodeWithConnector(canvas, "src");
    addNodeWithConnector(canvas, "dst", { x: 100, y: 100 });
    canvas.addConnection(
      {
        sourceNodeId: "src",
        sourceConnectorId: "c0",
        destinationNodeId: "dst",
        destinationConnectorId: "c0",
        shape: "straight",
        dash: "dotted",
      },
      false,
    );

    const serialized = canvas.serializeConnections();
    expect(serialized.length).toBeGreaterThan(0);
    expect(
      serialized.every(
        (connection) =>
          connection.shape === "straight" && connection.dash === "dotted",
      ),
    ).toBe(true);

    const restoredCanvas = new NodeflowData("restored");
    addNodeWithConnector(restoredCanvas, "src");
    addNodeWithConnector(restoredCanvas, "dst", { x: 100, y: 100 });
    restoredCanvas.addConnection(serialized[0], false);

    const restored = restoredCanvas.nodes
      .get("src")!
      .getConnector("c0")!
      .destinations.get(0)!;
    expect(restored.shape).toBe("straight");
    expect(restored.dash).toBe("dotted");
  });

  it("preserves shape and dash through remove/undo", () => {
    addNodeWithConnector(canvas, "src");
    addNodeWithConnector(canvas, "dst", { x: 100, y: 100 });
    canvas.addConnection({
      sourceNodeId: "src",
      sourceConnectorId: "c0",
      destinationNodeId: "dst",
      destinationConnectorId: "c0",
      shape: "straight",
      dash: "dashed",
    });

    canvas.removeConnection("src", "c0", "dst", "c0");
    expect(canvas.nodes.get("src")!.getConnector("c0")!.destinations.length).toBe(0);

    canvas.changes.undo();
    const restored = canvas.nodes
      .get("src")!
      .getConnector("c0")!
      .destinations.get(0)!;
    expect(restored.shape).toBe("straight");
    expect(restored.dash).toBe("dashed");
  });
});
