import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import NodeflowNodeData from "../src/NodeflowNodeData";
import Vec2 from "../src/Vec2";

declare global {
  interface CustomNodeflowDataType {}
}

let testId = 0;
function createNodeflow(): NodeflowData {
  return new NodeflowData(`test-nodeflow-${++testId}`);
}

function addNode(
  nodeflow: NodeflowData,
  params: Parameters<typeof nodeflow.addNode>[0] = {},
): NodeflowNodeData {
  return nodeflow.addNode(params, false);
}

describe("NodeflowNodeData – creation", () => {
  it("creates a node with a given id", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "node-1" });
    expect(node.id).toBe("node-1");
  });

  it("auto-assigns an id when none is provided", () => {
    const nf = createNodeflow();
    const node = addNode(nf);
    expect(typeof node.id).toBe("string");
    expect(node.id.length).toBeGreaterThan(0);
  });

  it("stores position correctly after creation", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { position: { x: 100, y: 200 } });
    expect(node.position.x).toBe(100);
    expect(node.position.y).toBe(200);
  });

  it("stores css correctly after creation", () => {
    const nf = createNodeflow();
    const node = addNode(nf, {
      id: "styled-node",
      css: { normal: "my-class", selected: "my-selected-class" },
    });
    expect(node.css.normal).toBe("my-class");
    expect(node.css.selected).toBe("my-selected-class");
  });
});

describe("NodeflowNodeData – connector sections", () => {
  let nf: NodeflowData;
  let node: NodeflowNodeData;

  beforeEach(() => {
    nf = createNodeflow();
    node = addNode(nf, { id: "node-cs" });
  });

  it("addConnectorSection – section appears in connectorSections map", () => {
    const section = node.addConnectorSection({ id: "output" }, false);
    expect(node.connectorSections.has("output")).toBe(true);
    expect(section.id).toBe("output");
  });

  it("addConnectorSection – passing an existing id auto-assigns a new id", () => {
    const s1 = node.addConnectorSection({ id: "inputs" }, false);
    const s2 = node.addConnectorSection({ id: "inputs" }, false);
    expect(s1.id).toBe("inputs");
    expect(s2.id).not.toBe("inputs");
    expect(node.connectorSections.size).toBe(2);
  });

  it("addConnectorSection – multiple different sections are tracked", () => {
    node.addConnectorSection({ id: "in" }, false);
    node.addConnectorSection({ id: "out" }, false);
    expect(node.connectorSections.size).toBe(2);
  });

  it("removeConnectorSection – section removed from map", () => {
    node.addConnectorSection({ id: "temp-section" }, false);
    expect(node.connectorSections.has("temp-section")).toBe(true);

    node.removeConnectorSection("temp-section", false);
    expect(node.connectorSections.has("temp-section")).toBe(false);
  });

  it("removeConnectorSection – removing non-existent section is a no-op", () => {
    node.addConnectorSection({ id: "only-section" }, false);
    node.removeConnectorSection("ghost-section", false);
    expect(node.connectorSections.size).toBe(1);
  });
});

describe("NodeflowNodeData – connectors", () => {
  let nf: NodeflowData;
  let node: NodeflowNodeData;

  beforeEach(() => {
    nf = createNodeflow();
    node = addNode(nf, { id: "node-conn" });
    node.addConnectorSection({ id: "section-a" }, false);
  });

  it("addConnector – connector appears in the section", () => {
    node.addConnector("section-a", { id: "conn-1" }, false);
    const section = node.connectorSections.get("section-a")!;
    expect(section.connectors.has("conn-1")).toBe(true);
  });

  it("addConnector – returns undefined when section does not exist", () => {
    const result = node.addConnector("missing-section", { id: "c" }, false);
    expect(result).toBeUndefined();
  });

  it("getConnector – finds connector by id across all sections", () => {
    node.addConnector("section-a", { id: "my-conn" }, false);
    const found = node.getConnector("my-conn");
    expect(found).toBeDefined();
    expect(found!.id).toBe("my-conn");
  });

  it("getConnector – returns undefined for unknown connector", () => {
    const found = node.getConnector("nonexistent-id");
    expect(found).toBeUndefined();
  });

  it("getConnectorCount – counts connectors across all sections", () => {
    node.addConnectorSection({ id: "section-b" }, false);
    node.addConnector("section-a", { id: "c1" }, false);
    node.addConnector("section-a", { id: "c2" }, false);
    node.addConnector("section-b", { id: "c3" }, false);
    expect(node.getConnectorCount()).toBe(3);
  });
});

describe("NodeflowNodeData – serialize / deserialize", () => {
  it("serialize produces a SerializedNodeflowNode with correct id and position", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "ser-node", position: { x: 42, y: 84 } });
    const serialized = node.serialize();

    expect(serialized.id).toBe("ser-node");
    expect(serialized.position.x).toBe(42);
    expect(serialized.position.y).toBe(84);
  });

  it("serialize includes connector sections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "ser-node-2" });
    node.addConnectorSection({ id: "s1" }, false);
    const serialized = node.serialize();

    expect("s1" in serialized.connectorSections).toBe(true);
  });

  it("serialize includes connectors within sections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "ser-node-3" });
    node.addConnectorSection({ id: "sec" }, false);
    node.addConnector("sec", { id: "c-one" }, false);
    const serialized = node.serialize();

    expect("c-one" in serialized.connectorSections["sec"].connectors).toBe(
      true,
    );
  });

  it("deserialize round-trip preserves sections and position", () => {
    const nf = createNodeflow();
    const original = addNode(nf, {
      id: "rt-node",
      position: { x: 10, y: 20 },
      css: { normal: "rt-class" },
    });
    original.addConnectorSection({ id: "rt-sec" }, false);
    original.addConnector("rt-sec", { id: "rt-conn" }, false);

    const serialized = original.serialize();

    const nf2 = createNodeflow();
    const restored = NodeflowNodeData.deserialize(nf2, serialized, false);

    expect(restored.id).toBe("rt-node");
    expect(restored.position.x).toBe(10);
    expect(restored.position.y).toBe(20);
    expect(restored.css.normal).toBe("rt-class");
    expect(restored.connectorSections.has("rt-sec")).toBe(true);
    expect(restored.getConnector("rt-conn")).toBeDefined();
  });

  it("deserialize round-trip preserves measured offset and size so the center is unchanged", () => {
    const nf = createNodeflow();
    const original = addNode(nf, {
      id: "rt-geometry",
      position: { x: 50, y: 70 },
    });
    original.updateMeasurements(Vec2.of(160, 60), Vec2.of(0, 0));

    const serialized = original.serialize();

    const nf2 = createNodeflow();
    const restored = NodeflowNodeData.deserialize(nf2, serialized, false);

    expect(restored.getCenter().x).toBe(original.getCenter().x);
    expect(restored.getCenter().y).toBe(original.getCenter().y);
  });

  it("applying the centering offset once is not repeated after a serialize round-trip", () => {
    const nf = createNodeflow();
    const centered = addNode(nf, {
      id: "centered-node",
      position: { x: 400, y: 300 },
      centered: true,
    });
    const size = Vec2.of(160, 60);
    centered.updateMeasurements(size, Vec2.zero());
    const halfSize = size.divideBy(2);

    centered.applyCenteringOffset(halfSize);
    const positionAfterFirst = centered.position.copy();

    expect(centered.centered).toBe(false);
    expect(positionAfterFirst.x).toBe(400 - 80);
    expect(positionAfterFirst.y).toBe(300 - 30);

    const nf2 = createNodeflow();
    const restored = NodeflowNodeData.deserialize(
      nf2,
      centered.serialize(),
      false,
    );
    restored.applyCenteringOffset(halfSize);

    expect(restored.position.x).toBe(positionAfterFirst.x);
    expect(restored.position.y).toBe(positionAfterFirst.y);
  });
});

describe("NodeflowNodeData – select / deselect", () => {
  it("select() adds node to mouseData selections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "sel-node" });

    expect(nf.mouseData.selections.isNodeSelected("sel-node")).toBe(false);

    node.select(Vec2.of(0, 0));

    expect(nf.mouseData.selections.isNodeSelected("sel-node")).toBe(true);
  });

  it("deselect via clearNodes() removes node from selections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "desel-node" });
    node.select(Vec2.of(0, 0));
    expect(nf.mouseData.selections.isNodeSelected("desel-node")).toBe(true);

    nf.mouseData.selections.clearNodes();
    expect(nf.mouseData.selections.isNodeSelected("desel-node")).toBe(false);
  });
});

describe("NodeflowNodeData – getCenter", () => {
  it("getCenter returns position + offset + size/2", () => {
    const nf = createNodeflow();
    const node = addNode(nf, {
      id: "center-node",
      position: { x: 100, y: 200 },
    });

    node.size = Vec2.of(80, 60);
    node.offset = Vec2.of(10, 10);

    const center = node.getCenter();

    expect(center.x).toBe(150);
    expect(center.y).toBe(240);
  });

  it("getCenter with zero size and offset equals position", () => {
    const nf = createNodeflow();
    const node = addNode(nf, {
      id: "center-node-2",
      position: { x: 50, y: 75 },
    });

    const center = node.getCenter();
    expect(center.x).toBe(50);
    expect(center.y).toBe(75);
  });
});

describe("NodeflowNodeData – update", () => {
  it("position setter changes position", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "upd-node", position: { x: 0, y: 0 } });

    node.position = Vec2.of(300, 400);
    expect(node.position.x).toBe(300);
    expect(node.position.y).toBe(400);
  });

  it("update() changes size", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "upd-node-2" });

    node.update({ size: Vec2.of(200, 150) });
    expect(node.size.x).toBe(200);
    expect(node.size.y).toBe(150);
  });

  it("update() changes offset", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "upd-node-3" });

    node.update({ offset: Vec2.of(5, 10) });
    expect(node.offset.x).toBe(5);
    expect(node.offset.y).toBe(10);
  });

  it("update() changes css", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "upd-node-4", css: { normal: "old" } });

    node.update({ css: { normal: "new-class", selected: "new-selected" } });
    expect(node.css.normal).toBe("new-class");
    expect(node.css.selected).toBe("new-selected");
  });
});

describe("NodeflowNodeData – derived geometry", () => {
  it("sizeWithOffset = size + offset", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "geo-node" });
    node.size = Vec2.of(100, 80);
    node.offset = Vec2.of(20, 10);

    const swo = node.sizeWithOffset;
    expect(swo.x).toBe(120);
    expect(swo.y).toBe(90);
  });

  it("rect uses position and size", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "rect-node", position: { x: 10, y: 20 } });
    node.size = Vec2.of(50, 30);

    const r = node.rect;
    expect(r.position.x).toBe(10);
    expect(r.position.y).toBe(20);
    expect(r.size.x).toBe(50);
    expect(r.size.y).toBe(30);
  });
});

describe("NodeflowNodeData – collision behavior", () => {
  it("isColliding returns false for a solo node", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "solo-node", position: { x: 0, y: 0 } });
    node.size = Vec2.of(100, 100);
    expect(node.isColliding()).toBe(false);
  });

  it("getCollidingNodes returns empty array for isolated node", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "iso-node", position: { x: 500, y: 500 } });
    node.size = Vec2.of(50, 50);
    expect(node.getCollidingNodes()).toEqual([]);
  });
});

describe("NodeflowNodeData – id generation", () => {
  it("getNextFreeConnectorSectionId returns '0' when no sections exist", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "id-gen-node" });
    expect(node.getNextFreeConnectorSectionId()).toBe("0");
  });

  it("getNextFreeConnectorSectionId increments past existing ids", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "id-gen-node-2" });
    node.addConnectorSection({ id: "0" }, false);
    expect(node.getNextFreeConnectorSectionId()).toBe("1");
  });

  it("getNextFreeConnectorId returns '0' when no connectors exist", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "id-gen-conn" });
    node.addConnectorSection({ id: "s" }, false);
    expect(node.getNextFreeConnectorId()).toBe("0");
  });
});
