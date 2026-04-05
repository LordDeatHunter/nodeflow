import { describe, it, expect, beforeEach } from "vitest";
import ConnectorSection from "../src/ConnectorSection";
import Vec2 from "../src/Vec2";
import { ReactiveMap } from "@solid-primitives/map";
import type { SerializedConnectorSection } from "../src/nodeflow-types";
import type { ConnectorSectionType } from "../src/types";
import type NodeConnector from "../src/NodeConnector";
import type { NodeflowData } from "../src";

function makeMockNode(nodeId = "node-1") {
  let connectorIdCounter = 0;
  return {
    id: nodeId,
    getNextFreeConnectorId: () => `connector-${connectorIdCounter++}`,
    getNextFreeConnectorSectionId: () => "section-auto",
    connectorSections: new Map(),
    nodeflow: {} as any,
    addConnector: () => {},
    removeConnector: () => {},
  } as any;
}

function makeMockNodeflowData(): NodeflowData {
  return {
    id: "nodeflow-1",
    changes: {
      addChange: () => {},
    },
  } as any;
}

function makeSection(
  sectionId = "section-1",
  nodeId = "node-1",
): ConnectorSection {
  const mockNode = makeMockNode(nodeId);
  const mockNodeflowData = makeMockNodeflowData();
  const data: ConnectorSectionType = {
    connectors: new ReactiveMap<string, NodeConnector>(),
    css: undefined,
    id: sectionId,
    parentNode: mockNode,
  };
  return new ConnectorSection(mockNodeflowData, data);
}

describe("ConnectorSection", () => {
  describe("creation with ID and node reference", () => {
    it("stores the given ID", () => {
      const section = makeSection("my-section");
      expect(section.id).toBe("my-section");
    });

    it("stores the parent node reference", () => {
      const section = makeSection("sec-1", "test-node");
      expect(section.parentNode.id).toBe("test-node");
    });

    it("starts with empty connectors map", () => {
      const section = makeSection("empty-sec");
      expect(section.connectors.size).toBe(0);
    });
  });

  describe("addConnector()", () => {
    it("connector appears in connectors map after addConnector", () => {
      const section = makeSection("sec-add");
      const connector = section.addConnector({ id: "conn-1" }, false);
      expect(section.connectors.has("conn-1")).toBe(true);
      expect(connector.id).toBe("conn-1");
    });

    it("adds a second connector with auto-generated ID when the requested ID is already taken", () => {
      const section = makeSection("sec-dup");
      const first = section.addConnector({ id: "conn-dup" }, false);
      const second = section.addConnector({ id: "conn-dup" }, false);
      expect(section.connectors.size).toBe(2);
      expect(first.id).toBe("conn-dup");
      expect(second.id).not.toBe("conn-dup");
    });

    it("multiple connectors all appear in the connectors map", () => {
      const section = makeSection("sec-multi");
      section.addConnector({ id: "c-1" }, false);
      section.addConnector({ id: "c-2" }, false);
      section.addConnector({ id: "c-3" }, false);
      expect(section.connectors.size).toBe(3);
      expect(section.connectors.has("c-1")).toBe(true);
      expect(section.connectors.has("c-2")).toBe(true);
      expect(section.connectors.has("c-3")).toBe(true);
    });
  });

  describe("removeConnector()", () => {
    it("connector is no longer in map after removal", () => {
      const section = makeSection("sec-rm");
      section.addConnector({ id: "to-remove" }, false);
      expect(section.connectors.has("to-remove")).toBe(true);
      section.removeConnector("to-remove", false);
      expect(section.connectors.has("to-remove")).toBe(false);
    });

    it("removing a non-existent connector is a no-op", () => {
      const section = makeSection("sec-noop");
      expect(() =>
        section.removeConnector("does-not-exist", false),
      ).not.toThrow();
    });
  });

  describe("connector lookup by ID", () => {
    it("connectors.get(id) returns the correct connector", () => {
      const section = makeSection("sec-lookup");
      section.addConnector({ id: "lookup-conn" }, false);
      const found = section.connectors.get("lookup-conn");
      expect(found).toBeDefined();
      expect(found!.id).toBe("lookup-conn");
    });
  });

  describe("serialize()", () => {
    it("produces a serialized shape with the correct id", () => {
      const section = makeSection("ser-section");
      const serialized = section.serialize();
      expect(serialized.id).toBe("ser-section");
    });

    it("serialized connectors record includes all added connectors", () => {
      const section = makeSection("ser-multi");
      section.addConnector({ id: "sc-1" }, false);
      section.addConnector({ id: "sc-2" }, false);
      const serialized = section.serialize();
      expect(Object.keys(serialized.connectors)).toHaveLength(2);
      expect(serialized.connectors["sc-1"]).toBeDefined();
      expect(serialized.connectors["sc-2"]).toBeDefined();
    });

    it("serialized connector has expected shape", () => {
      const section = makeSection("ser-shape");
      section.addConnector({ id: "shaped-conn", hovered: false }, false);
      const serialized = section.serialize();
      const conn = serialized.connectors["shaped-conn"];
      expect(conn.id).toBe("shaped-conn");
      expect(typeof conn.hovered).toBe("boolean");
      expect(conn.position).toBeDefined();
    });

    it("serialized output has no connectors when map is empty", () => {
      const section = makeSection("ser-empty");
      const serialized = section.serialize();
      expect(Object.keys(serialized.connectors)).toHaveLength(0);
    });
  });

  describe("deserialize() round-trip", () => {
    it("round-trip preserves connector IDs", () => {
      const section = makeSection("roundtrip-sec");
      section.addConnector({ id: "rt-conn-1" }, false);
      section.addConnector({ id: "rt-conn-2" }, false);

      const serialized = section.serialize();

      const mockNode = makeMockNode("rt-node");
      const rebuilt = ConnectorSection.deserialize(serialized, mockNode, false);

      expect(rebuilt.id).toBe("roundtrip-sec");
      expect(rebuilt.connectors.has("rt-conn-1")).toBe(true);
      expect(rebuilt.connectors.has("rt-conn-2")).toBe(true);
    });

    it("round-trip preserves connector position data", () => {
      const section = makeSection("pos-roundtrip");
      section.addConnector(
        { id: "pos-conn", position: { x: 5, y: 15 } },
        false,
      );
      const serialized = section.serialize();

      const mockNode = makeMockNode("pos-node");
      const rebuilt = ConnectorSection.deserialize(serialized, mockNode, false);

      const conn = rebuilt.connectors.get("pos-conn");
      expect(conn).toBeDefined();
      expect(conn!.position.x).toBe(5);
      expect(conn!.position.y).toBe(15);
    });
  });
});
