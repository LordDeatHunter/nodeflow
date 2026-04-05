import { describe, it, expect, beforeEach } from "vitest";
import NodeConnector from "../src/NodeConnector";
import ArrayWrapper from "../src/ArrayWrapper";
import Vec2 from "../src/Vec2";
import ConnectorDestination from "../src/ConnectorDestination";
import ConnectorSource from "../src/ConnectorSource";
import type { ConnectorSectionType, NodeConnectorType } from "../src/types";

function makeMockSection(sectionId = "section-1"): ConnectorSectionType {
  const mockNode = {
    id: "node-1",
    getNextFreeConnectorId: () => "connector-auto",
    position: Vec2.zero(),
    offset: Vec2.zero(),
  } as any;

  return {
    connectors: new Map() as any,
    css: undefined,
    id: sectionId,
    parentNode: mockNode,
  };
}

function makeConnector(
  id = "connector-1",
  section?: ConnectorSectionType,
): NodeConnector {
  const parentSection = section ?? makeMockSection();
  return new NodeConnector({
    css: undefined,
    destinations: new ArrayWrapper<ConnectorDestination>(),
    hovered: false,
    id,
    parentSection,
    position: Vec2.of(10, 20),
    size: Vec2.of(16, 16),
    sources: new ArrayWrapper<ConnectorSource>(),
  } satisfies NodeConnectorType);
}

describe("NodeConnector", () => {
  describe("creation with ID", () => {
    it("stores the given ID", () => {
      const connector = makeConnector("my-connector");
      expect(connector.id).toBe("my-connector");
    });

    it("starts with hovered = false", () => {
      const connector = makeConnector("c1");
      expect(connector.hovered).toBe(false);
    });
  });

  describe("position getter", () => {
    it("returns the Vec2 position passed in", () => {
      const connector = makeConnector("pos-test");
      expect(connector.position.x).toBe(10);
      expect(connector.position.y).toBe(20);
    });

    it("position can be updated via setter", () => {
      const connector = makeConnector("pos-set");
      connector.position = Vec2.of(99, 77);
      expect(connector.position.x).toBe(99);
      expect(connector.position.y).toBe(77);
    });
  });

  describe("size getter", () => {
    it("returns the Vec2 size passed in", () => {
      const connector = makeConnector("size-test");
      expect(connector.size.x).toBe(16);
      expect(connector.size.y).toBe(16);
    });
  });

  describe("destinations (addDestination / removeDestination)", () => {
    it("starts with empty destinations", () => {
      const connector = makeConnector("dest-empty");
      expect(connector.destinations.length).toBe(0);
    });

    it("push adds a destination to the destinations array", () => {
      const connector = makeConnector("dest-add");
      const destConnector = makeConnector("dest-connector");
      const destination = new ConnectorDestination({
        css: {},
        destinationConnector: destConnector,
        path: undefined,
      });
      connector.destinations.push(destination);
      expect(connector.destinations.length).toBe(1);
      expect(connector.destinations.get(0)!.destinationConnector.id).toBe(
        "dest-connector",
      );
    });

    it("filterInPlace removes a destination", () => {
      const connector = makeConnector("dest-remove");
      const destConnector = makeConnector("to-remove");
      const destination = new ConnectorDestination({
        css: {},
        destinationConnector: destConnector,
        path: undefined,
      });
      connector.destinations.push(destination);
      expect(connector.destinations.length).toBe(1);

      connector.destinations.filterInPlace(
        (d) => d.destinationConnector.id !== "to-remove",
      );
      expect(connector.destinations.length).toBe(0);
    });

    it("multiple destinations all appear in the array", () => {
      const connector = makeConnector("multi-dest");
      for (let i = 0; i < 3; i++) {
        const dest = new ConnectorDestination({
          css: {},
          destinationConnector: makeConnector(`dest-${i}`),
          path: undefined,
        });
        connector.destinations.push(dest);
      }
      expect(connector.destinations.length).toBe(3);
      expect(connector.destinations.get(0)!.destinationConnector.id).toBe(
        "dest-0",
      );
      expect(connector.destinations.get(2)!.destinationConnector.id).toBe(
        "dest-2",
      );
    });
  });

  describe("sources (addSource / removeSource)", () => {
    it("starts with empty sources", () => {
      const connector = makeConnector("src-empty");
      expect(connector.sources.length).toBe(0);
    });

    it("push adds a source to the sources array", () => {
      const connector = makeConnector("src-add");
      const srcConnector = makeConnector("source-connector");
      const source = new ConnectorSource({ sourceConnector: srcConnector });
      connector.sources.push(source);
      expect(connector.sources.length).toBe(1);
      expect(connector.sources.get(0)!.sourceConnector.id).toBe(
        "source-connector",
      );
    });

    it("filterInPlace removes a source", () => {
      const connector = makeConnector("src-remove");
      const srcConnector = makeConnector("src-to-remove");
      const source = new ConnectorSource({ sourceConnector: srcConnector });
      connector.sources.push(source);
      expect(connector.sources.length).toBe(1);

      connector.sources.filterInPlace(
        (s) => s.sourceConnector.id !== "src-to-remove",
      );
      expect(connector.sources.length).toBe(0);
    });
  });

  describe("serialize()", () => {
    it("produces the correct serialized shape", () => {
      const connector = makeConnector("serialize-test");
      const serialized = connector.serialize();

      expect(serialized.id).toBe("serialize-test");
      expect(serialized.hovered).toBe(false);
      expect(serialized.position).toEqual({ x: 10, y: 20 });
      expect(serialized.css).toBeUndefined();
    });

    it("serialized position reflects updated position", () => {
      const connector = makeConnector("serialize-pos");
      connector.position = Vec2.of(50, 60);
      const serialized = connector.serialize();
      expect(serialized.position).toEqual({ x: 50, y: 60 });
    });
  });

  describe("hovered setter", () => {
    it("can update hovered via setter", () => {
      const connector = makeConnector("hover-test");
      expect(connector.hovered).toBe(false);
      connector.hovered = true;
      expect(connector.hovered).toBe(true);
    });
  });

  describe("parentSection getter", () => {
    it("returns the parent section", () => {
      const section = makeMockSection("sec-42");
      const connector = makeConnector("parent-test", section);
      expect(connector.parentSection.id).toBe("sec-42");
    });
  });

  describe("parentNode getter", () => {
    it("returns the parent node via parentSection", () => {
      const section = makeMockSection("sec-node");
      const connector = makeConnector("node-test", section);
      expect(connector.parentNode.id).toBe("node-1");
    });
  });
});
