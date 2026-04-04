/**
 * Behavioral tests for NodeflowData
 *
 * Tests the public API of the Solid-based NodeflowData implementation.
 * Uses the class's public getters/methods — no reactive tracking required.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import NodeflowData from "../../../src/utils/data/NodeflowData";
import Vec2 from "../../../src/utils/data/Vec2";

// Declare the global required by NodeflowNodeData
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Adds a node + one connector section + one connector to a canvas.
 * Returns the IDs so tests can reference them.
 */
function addNodeWithConnector(
  canvas: NodeflowData,
  position = { x: 0, y: 0 },
  nodeId?: string,
  sectionId = "s0",
  connectorId = "c0",
) {
  const node = canvas.addNode(
    {
      id: nodeId,
      position,
      connectorSections: {
        [sectionId]: {
          id: sectionId,
          connectors: {
            [connectorId]: {
              id: connectorId,
              hovered: false,
              position: { x: 0, y: 0 },
            },
          },
        },
      },
    },
    false, // no history
  );
  return { node, nodeId: node.id, sectionId, connectorId };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("NodeflowData", () => {
  let canvas: NodeflowData;

  beforeEach(() => {
    // Fresh canvas for every test
    canvas = new NodeflowData("test-canvas");
  });

  // ── 1. Construction ──────────────────────────────────────────────────────
  describe("constructor", () => {
    it("creates canvas with correct id", () => {
      expect(canvas.id).toBe("test-canvas");
    });

    it("starts with an empty nodes map", () => {
      expect(canvas.nodes.size).toBe(0);
    });

    it("starts with zoomLevel of 1", () => {
      expect(canvas.zoomLevel).toBe(1);
    });

    it("starts with position at origin", () => {
      expect(canvas.position.x).toBe(0);
      expect(canvas.position.y).toBe(0);
    });

    it("applies custom settings", () => {
      const customCanvas = new NodeflowData("c2", { maxZoom: 5, minZoom: 0.5 });
      expect(customCanvas.settings.maxZoom).toBe(5);
      expect(customCanvas.settings.minZoom).toBe(0.5);
    });
  });

  // ── 2. addNode ────────────────────────────────────────────────────────────
  describe("addNode", () => {
    it("adds a node to the nodes map", () => {
      canvas.addNode({ id: "n1" }, false);
      expect(canvas.nodes.has("n1")).toBe(true);
    });

    it("node is added with correct position", () => {
      canvas.addNode({ id: "n1", position: { x: 42, y: 77 } }, false);
      const node = canvas.nodes.get("n1")!;
      expect(node.position.x).toBe(42);
      expect(node.position.y).toBe(77);
    });

    it("returns the created NodeflowNodeData instance", () => {
      const node = canvas.addNode({ id: "n1" }, false);
      expect(node).toBeDefined();
      expect(node.id).toBe("n1");
    });

    it("multiple nodes all appear in the nodes map", () => {
      canvas.addNode({ id: "a" }, false);
      canvas.addNode({ id: "b" }, false);
      canvas.addNode({ id: "c" }, false);
      expect(canvas.nodes.size).toBe(3);
      expect(canvas.nodes.has("a")).toBe(true);
      expect(canvas.nodes.has("b")).toBe(true);
      expect(canvas.nodes.has("c")).toBe(true);
    });
  });

  // ── 3. removeNode ─────────────────────────────────────────────────────────
  describe("removeNode", () => {
    it("removes a node from the nodes map", () => {
      canvas.addNode({ id: "n1" }, false);
      expect(canvas.nodes.has("n1")).toBe(true);
      canvas.removeNode("n1", false);
      expect(canvas.nodes.has("n1")).toBe(false);
    });

    it("does not throw when removing a non-existent node", () => {
      expect(() => canvas.removeNode("does-not-exist", false)).not.toThrow();
    });

    it("removing one node does not affect other nodes", () => {
      canvas.addNode({ id: "n1" }, false);
      canvas.addNode({ id: "n2" }, false);
      canvas.removeNode("n1", false);
      expect(canvas.nodes.has("n1")).toBe(false);
      expect(canvas.nodes.has("n2")).toBe(true);
    });
  });

  // ── 4. addConnection ──────────────────────────────────────────────────────
  describe("addConnection", () => {
    it("establishes a connection between two connectors", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 100 },
        "dst",
        "s0",
        "c0",
      );

      canvas.addConnection(
        {
          sourceNodeId: src.nodeId,
          sourceConnectorId: src.connectorId,
          destinationNodeId: dst.nodeId,
          destinationConnectorId: dst.connectorId,
        },
        false,
      );

      const sourceNode = canvas.nodes.get(src.nodeId)!;
      const sourceConnector = sourceNode.getConnector(src.connectorId)!;
      expect(sourceConnector.destinations.length).toBe(1);
    });

    it("does not duplicate an already-existing connection", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 100 },
        "dst",
        "s0",
        "c0",
      );

      const connectionData = {
        sourceNodeId: src.nodeId,
        sourceConnectorId: src.connectorId,
        destinationNodeId: dst.nodeId,
        destinationConnectorId: dst.connectorId,
      };
      canvas.addConnection(connectionData, false);
      canvas.addConnection(connectionData, false); // second call must be ignored

      const sourceConnector = canvas.nodes
        .get(src.nodeId)!
        .getConnector(src.connectorId)!;
      expect(sourceConnector.destinations.length).toBe(1);
    });
  });

  // ── 5. removeConnection ───────────────────────────────────────────────────
  describe("removeConnection", () => {
    it("removes a connection from the source connector", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 100 },
        "dst",
        "s0",
        "c0",
      );

      canvas.addConnection(
        {
          sourceNodeId: src.nodeId,
          sourceConnectorId: src.connectorId,
          destinationNodeId: dst.nodeId,
          destinationConnectorId: dst.connectorId,
        },
        false,
      );

      canvas.removeConnection(
        src.nodeId,
        src.connectorId,
        dst.nodeId,
        dst.connectorId,
        false,
      );

      const sourceConnector = canvas.nodes
        .get(src.nodeId)!
        .getConnector(src.connectorId)!;
      expect(sourceConnector.destinations.length).toBe(0);
    });

    it("does not throw when removing a non-existent connection", () => {
      canvas.addNode({ id: "n1" }, false);
      expect(() =>
        canvas.removeConnection("n1", "c0", "n2", "c0", false),
      ).not.toThrow();
    });
  });

  // ── 6. updateZoom ─────────────────────────────────────────────────────────
  describe("updateZoom", () => {
    it("increases zoomLevel when given a positive distance", () => {
      const before = canvas.zoomLevel;
      canvas.updateZoom(100, Vec2.of(0, 0));
      expect(canvas.zoomLevel).toBeGreaterThan(before);
    });

    it("decreases zoomLevel when given a negative distance", () => {
      const before = canvas.zoomLevel;
      canvas.updateZoom(-100, Vec2.of(0, 0));
      expect(canvas.zoomLevel).toBeLessThan(before);
    });

    it("does not exceed maxZoom", () => {
      const max = canvas.settings.maxZoom;
      // Apply a huge zoom-in repeatedly
      for (let i = 0; i < 1000; i++) {
        canvas.updateZoom(10000, Vec2.of(0, 0));
      }
      expect(canvas.zoomLevel).toBeLessThanOrEqual(max);
    });

    it("does not go below minZoom", () => {
      const min = canvas.settings.minZoom;
      // Apply a huge zoom-out repeatedly
      for (let i = 0; i < 1000; i++) {
        canvas.updateZoom(-10000, Vec2.of(0, 0));
      }
      expect(canvas.zoomLevel).toBeGreaterThanOrEqual(min);
    });

    it("ignores a zero distance call", () => {
      const before = canvas.zoomLevel;
      canvas.updateZoom(0, Vec2.of(0, 0));
      expect(canvas.zoomLevel).toBe(before);
    });
  });

  // ── 7. transformVec2ToCanvas ──────────────────────────────────────────────
  describe("transformVec2ToCanvas", () => {
    it("identity transform with default state (zoom=1, pos=(0,0), start=(0,0))", () => {
      const result = canvas.transformVec2ToCanvas(Vec2.of(150, 250));
      expect(result.x).toBe(150);
      expect(result.y).toBe(250);
    });

    it("accounts for canvas position offset", () => {
      // Simulate pan: position = (20, 30)
      canvas.position = Vec2.of(20, 30);
      const result = canvas.transformVec2ToCanvas(Vec2.of(100, 100));
      // (100 - 0) / 1 - 20 = 80,  (100 - 0) / 1 - 30 = 70
      expect(result.x).toBeCloseTo(80);
      expect(result.y).toBeCloseTo(70);
    });

    it("accounts for zoom level", () => {
      canvas.zoomLevel = 2;
      const result = canvas.transformVec2ToCanvas(Vec2.of(200, 100));
      // (200 - 0) / 2 - 0 = 100,  (100 - 0) / 2 - 0 = 50
      expect(result.x).toBeCloseTo(100);
      expect(result.y).toBeCloseTo(50);
    });
  });

  // ── 8. serialize / deserialize ────────────────────────────────────────────
  describe("serialize / deserialize", () => {
    it("serialize returns an object with a nodes key", () => {
      const serialized = canvas.serialize();
      expect(serialized).toHaveProperty("nodes");
      expect(serialized).toHaveProperty("zoomLevel");
    });

    it("serialized nodes count matches added nodes", () => {
      canvas.addNode({ id: "n1", position: { x: 10, y: 20 } }, false);
      canvas.addNode({ id: "n2", position: { x: 30, y: 40 } }, false);
      const serialized = canvas.serialize();
      expect(Object.keys(serialized.nodes).length).toBe(2);
    });

    it("round-trip preserves node count", () => {
      canvas.addNode({ id: "n1", position: { x: 10, y: 20 } }, false);
      canvas.addNode({ id: "n2", position: { x: 30, y: 40 } }, false);

      const serialized = canvas.serialize();
      const restored = new NodeflowData("restored-canvas");
      restored.deserialize(serialized, false);

      expect(restored.nodes.size).toBe(2);
    });

    it("round-trip preserves node positions", () => {
      canvas.addNode({ id: "n1", position: { x: 55, y: 77 } }, false);

      const serialized = canvas.serialize();
      const restored = new NodeflowData("restored-canvas");
      restored.deserialize(serialized, false);

      const node = restored.nodes.get("n1")!;
      expect(node.position.x).toBe(55);
      expect(node.position.y).toBe(77);
    });

    it("round-trip preserves zoomLevel", () => {
      canvas.zoomLevel = 1.5;
      const serialized = canvas.serialize();
      const restored = new NodeflowData("restored-canvas");
      restored.deserialize(serialized, false);
      expect(restored.zoomLevel).toBeCloseTo(1.5);
    });

    it("round-trip preserves connections", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 0 },
        "dst",
        "s0",
        "c0",
      );
      canvas.addConnection(
        {
          sourceNodeId: src.nodeId,
          sourceConnectorId: src.connectorId,
          destinationNodeId: dst.nodeId,
          destinationConnectorId: dst.connectorId,
        },
        false,
      );

      const serialized = canvas.serialize();
      expect(serialized.connections.length).toBeGreaterThanOrEqual(1);

      const restored = new NodeflowData("restored-canvas");
      restored.deserialize(serialized, false);

      const restoredSrc = restored.nodes.get(src.nodeId)!;
      const restoredConnector = restoredSrc.getConnector(src.connectorId)!;
      expect(restoredConnector.destinations.length).toBe(1);
    });
  });

  // ── 9. updateSettings ─────────────────────────────────────────────────────
  describe("updateSettings", () => {
    it("updates a single setting", () => {
      expect(canvas.settings.debugMode).toBe(false);
      canvas.updateSettings({ debugMode: true });
      expect(canvas.settings.debugMode).toBe(true);
    });

    it("updates multiple settings at once", () => {
      canvas.updateSettings({ canAddNodes: false, canDeleteNodes: false });
      expect(canvas.settings.canAddNodes).toBe(false);
      expect(canvas.settings.canDeleteNodes).toBe(false);
    });

    it("does not affect unrelated settings", () => {
      const prevMaxZoom = canvas.settings.maxZoom;
      canvas.updateSettings({ debugMode: true });
      expect(canvas.settings.maxZoom).toBe(prevMaxZoom);
    });
  });

  // ── 10. getNextFreeNodeId ─────────────────────────────────────────────────
  describe("getNextFreeNodeId", () => {
    it("returns '0' for an empty canvas", () => {
      expect(canvas.getNextFreeNodeId()).toBe("0");
    });

    it("returns a unique id after adding a node with id '0'", () => {
      canvas.addNode({ id: "0" }, false);
      const nextId = canvas.getNextFreeNodeId();
      expect(nextId).not.toBe("0");
      expect(canvas.nodes.has(nextId)).toBe(false);
    });

    it("returns unique ids on successive calls after filling slots", () => {
      canvas.addNode({ id: "0" }, false);
      canvas.addNode({ id: "1" }, false);
      canvas.addNode({ id: "2" }, false);
      const nextId = canvas.getNextFreeNodeId();
      expect(["0", "1", "2"]).not.toContain(nextId);
    });
  });

  // ── 11. getAllSourceConnectors ─────────────────────────────────────────────
  describe("getAllSourceConnectors", () => {
    it("returns empty array for non-existent node", () => {
      expect(canvas.getAllSourceConnectors("does-not-exist")).toEqual([]);
    });

    it("returns connectors that have outgoing connections", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 0 },
        "dst",
        "s0",
        "c0",
      );
      canvas.addConnection(
        {
          sourceNodeId: src.nodeId,
          sourceConnectorId: src.connectorId,
          destinationNodeId: dst.nodeId,
          destinationConnectorId: dst.connectorId,
        },
        false,
      );
      const sources = canvas.getAllSourceConnectors(dst.nodeId);
      expect(sources.length).toBe(1);
      expect(sources[0].id).toBe(src.connectorId);
    });
  });

  // ── 12. removeNode cleans up connections ──────────────────────────────────
  describe("removeNode connection cleanup", () => {
    it("removes incoming connections when a destination node is deleted", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 0 },
        "dst",
        "s0",
        "c0",
      );
      canvas.addConnection(
        {
          sourceNodeId: src.nodeId,
          sourceConnectorId: src.connectorId,
          destinationNodeId: dst.nodeId,
          destinationConnectorId: dst.connectorId,
        },
        false,
      );

      canvas.removeNode(dst.nodeId, false);

      const srcConnector = canvas.nodes
        .get(src.nodeId)!
        .getConnector(src.connectorId)!;
      expect(srcConnector.destinations.length).toBe(0);
    });
  });
});
