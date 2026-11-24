import { describe, it, expect } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import { analyzeCompositeSelection } from "../src/CompositeNodes";
import type { SerializedConnection } from "../src/nodeflow-types";

let testId = 0;
const createNodeflow = () => new NodeflowData(`test-composite-${++testId}`);

/** Adds a node with `inputs` and `outputs` sections, like the Blueprint example. */
const addNode = (
  nf: NodeflowData,
  id: string,
  x: number,
  y: number,
  inputs: number,
  outputs: number,
) =>
  nf.addNode(
    {
      id,
      position: { x, y },
      size: { x: 100, y: 50 },
      customData: { label: id } as unknown as CustomNodeflowDataType,
      connectorSections: {
        inputs: {
          id: "inputs",
          connectors: Object.fromEntries(
            Array.from({ length: inputs }, (_, i) => [
              `input-${i}`,
              { id: `input-${i}`, hovered: false, position: { x: 0, y: 0 } },
            ]),
          ),
        },
        outputs: {
          id: "outputs",
          connectors: Object.fromEntries(
            Array.from({ length: outputs }, (_, i) => [
              `output-${i}`,
              { id: `output-${i}`, hovered: false, position: { x: 0, y: 0 } },
            ]),
          ),
        },
      },
    },
    false,
  );

const connect = (
  nf: NodeflowData,
  source: string,
  destination: string,
  destinationConnectorId: string,
  sourceConnectorId = "output-0",
) =>
  nf.addConnection(
    {
      sourceNodeId: source,
      sourceConnectorId,
      destinationNodeId: destination,
      destinationConnectorId,
      css: { normal: "line" },
    },
    false,
  );

/** a, b -> sum -> display */
const buildDemo = () => {
  const nf = createNodeflow();
  addNode(nf, "a", 0, 0, 0, 1);
  addNode(nf, "b", 0, 200, 0, 1);
  addNode(nf, "sum", 300, 100, 2, 1);
  addNode(nf, "display", 600, 100, 1, 0);
  connect(nf, "a", "sum", "input-0");
  connect(nf, "b", "sum", "input-1");
  connect(nf, "sum", "display", "input-0");
  return nf;
};

const connectionKey = (c: SerializedConnection) =>
  `${c.sourceNodeId}.${c.sourceConnectorId}->${c.destinationNodeId}.${c.destinationConnectorId}`;

// serializeConnections lists each connection from both of its ends.
const allConnections = (nf: NodeflowData) =>
  [...new Set(nf.serializeConnections().map(connectionKey))].sort();

describe("analyzeCompositeSelection", () => {
  it("exposes free outputs and outputs feeding the outside", () => {
    const nf = buildDemo();
    const analysis = analyzeCompositeSelection(nf, ["a", "b", "sum"])!;

    expect(analysis.definition.inputs).toEqual([]);
    expect(analysis.definition.outputs).toEqual([
      { id: "output-0", innerNodeId: "sum", innerConnectorId: "output-0" },
    ]);
    expect(analysis.definition.connections.map(connectionKey).sort()).toEqual(
      ["a.output-0->sum.input-0", "b.output-0->sum.input-1"],
    );
    expect(analysis.external.map((e) => connectionKey(e.connection))).toEqual([
      "sum.output-0->display.input-0",
    ]);
  });

  it("exposes inputs fed from outside, in position order", () => {
    const nf = buildDemo();
    const analysis = analyzeCompositeSelection(nf, ["display", "sum"])!;

    expect(analysis.definition.inputs).toEqual([
      { id: "input-0", innerNodeId: "sum", innerConnectorId: "input-0" },
      { id: "input-1", innerNodeId: "sum", innerConnectorId: "input-1" },
    ]);
    expect(analysis.definition.outputs).toEqual([]);
    expect(analysis.origin.equals(Vec2.of(300, 100))).toBe(true);
    expect(analysis.definition.nodes.display.position).toEqual({ x: 300, y: 0 });
  });

  it("exposes unconnected connectors", () => {
    const nf = createNodeflow();
    addNode(nf, "lonely", 0, 0, 2, 1);
    const analysis = analyzeCompositeSelection(nf, ["lonely"])!;

    expect(analysis.definition.inputs.map((p) => p.innerConnectorId)).toEqual([
      "input-0",
      "input-1",
    ]);
    expect(analysis.definition.outputs.map((p) => p.innerConnectorId)).toEqual(
      ["output-0"],
    );
  });

  it("returns undefined for an empty selection", () => {
    expect(analyzeCompositeSelection(createNodeflow(), ["nope"])).toBeUndefined();
  });
});

describe("NodeflowData.createCompositeNode", () => {
  it("replaces the selection and rewires outside connections", () => {
    const nf = buildDemo();
    const composite = nf.createCompositeNode(["a", "b", "sum"], {
      customData: { label: "derived" } as unknown as CustomNodeflowDataType,
    })!;

    expect([...nf.nodes.keys()].sort()).toEqual(
      [composite.id, "display"].sort(),
    );
    expect(composite.isComposite).toBe(true);
    expect(composite.position.equals(Vec2.of(0, 0))).toBe(true);
    expect(composite.connectorSections.get("outputs")!.connectors.size).toBe(1);
    expect(allConnections(nf)).toEqual([
      `${composite.id}.output-0->display.input-0`,
    ]);
    // The rewired connection keeps its styling.
    expect(nf.serializeConnections()[0].css).toEqual({ normal: "line" });
    expect(nf.mouseData.hasSelectedNode(composite.id)).toBe(true);
  });

  it("is one undo step, and redo re-applies it", () => {
    const nf = buildDemo();
    const before = allConnections(nf);
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    const after = allConnections(nf);

    nf.changes.undo();
    expect([...nf.nodes.keys()].sort()).toEqual(["a", "b", "display", "sum"]);
    expect(allConnections(nf)).toEqual(before);

    nf.changes.redo();
    expect([...nf.nodes.keys()].sort()).toEqual(
      [composite.id, "display"].sort(),
    );
    expect(allConnections(nf)).toEqual(after);
  });

  it("publishes onCompositeCreated", () => {
    const nf = buildDemo();
    const seen: Array<unknown> = [];
    nf.eventStore.onCompositeCreated.subscribe("test", (data) =>
      seen.push(data),
    );
    const composite = nf.createCompositeNode(["sum", "display"])!;
    expect(seen).toEqual([
      { nodeId: composite.id, innerNodeIds: ["sum", "display"] },
    ]);
  });
});

describe("NodeflowData.explodeCompositeNode", () => {
  it("restores nodes, internal and outside connections", () => {
    const nf = buildDemo();
    const before = allConnections(nf);
    const composite = nf.createCompositeNode(["sum", "display"])!;
    nf.updateNode(composite.id, { position: Vec2.of(1000, 1000) }, false);

    const restored = nf.explodeCompositeNode(composite.id);

    expect(restored.map((node) => node.id).sort()).toEqual(["display", "sum"]);
    expect(nf.nodes.has(composite.id)).toBe(false);
    expect(allConnections(nf)).toEqual(before);
    // Positions follow the composite.
    expect(nf.nodes.get("sum")!.position.equals(Vec2.of(1000, 1000))).toBe(
      true,
    );
    expect(nf.nodes.get("display")!.position.equals(Vec2.of(1300, 1000))).toBe(
      true,
    );
  });

  it("keeps connections made to the composite after it was created", () => {
    const nf = buildDemo();
    addNode(nf, "c", 0, 400, 0, 1);
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    nf.removeConnection(composite.id, "output-0", "display", "input-0", false);
    addNode(nf, "d", 900, 100, 1, 0);
    connect(nf, composite.id, "d", "input-0");

    nf.explodeCompositeNode(composite.id);

    expect(allConnections(nf)).toEqual(
      [
        "a.output-0->sum.input-0",
        "b.output-0->sum.input-1",
        "sum.output-0->d.input-0",
      ].sort(),
    );
  });

  it("gives inner nodes fresh ids when theirs are taken", () => {
    const nf = buildDemo();
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    addNode(nf, "a", 50, 50, 0, 1);

    const restored = nf.explodeCompositeNode(composite.id);
    const ids = restored.map((node) => node.id);

    expect(ids).toContain("b");
    expect(ids).toContain("sum");
    expect(ids).not.toContain("a");
    const renamed = ids.find((id) => id !== "b" && id !== "sum")!;
    expect(allConnections(nf)).toContain(`${renamed}.output-0->sum.input-0`);
  });

  it("is one undo step", () => {
    const nf = buildDemo();
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    const collapsed = allConnections(nf);

    nf.explodeCompositeNode(composite.id);
    nf.changes.undo();

    expect([...nf.nodes.keys()].sort()).toEqual(
      [composite.id, "display"].sort(),
    );
    expect(allConnections(nf)).toEqual(collapsed);
  });

  it("supports nested composites", () => {
    const nf = buildDemo();
    const before = allConnections(nf);
    const inner = nf.createCompositeNode(["a", "b"])!;
    const outer = nf.createCompositeNode([inner.id, "sum"])!;

    expect(allConnections(nf)).toEqual([
      `${outer.id}.output-0->display.input-0`,
    ]);

    const [restoredInner] = nf
      .explodeCompositeNode(outer.id)
      .filter((node) => node.isComposite);
    nf.explodeCompositeNode(restoredInner.id);

    expect(allConnections(nf)).toEqual(before);
  });

  it("ignores plain nodes", () => {
    const nf = buildDemo();
    expect(nf.explodeCompositeNode("sum")).toEqual([]);
    expect(nf.nodes.has("sum")).toBe(true);
  });
});

describe("composite fan-out ports", () => {
  it("explode re-wires an input port to every target", () => {
    const nf = createNodeflow();
    addNode(nf, "src", 0, 0, 0, 1);
    addNode(nf, "x", 300, 0, 1, 1);
    addNode(nf, "y", 300, 200, 1, 1);
    const composite = nf.createCompositeNode(["x", "y"])!;
    const definition = composite.composite!;
    const [first, second] = definition.inputs;
    nf.updateCompositeNode(composite.id, {
      ...definition,
      inputs: [
        {
          ...first,
          extraTargets: [
            {
              innerNodeId: second.innerNodeId,
              innerConnectorId: second.innerConnectorId,
            },
          ],
        },
      ],
    });
    connect(nf, "src", composite.id, "input-0");

    nf.explodeCompositeNode(composite.id);

    expect(allConnections(nf)).toEqual(
      ["src.output-0->x.input-0", "src.output-0->y.input-0"].sort(),
    );
  });
});

describe("NodeflowData.updateCompositeNode", () => {
  it("keeps wires to remaining ports and drops the rest", () => {
    const nf = buildDemo();
    addNode(nf, "c", 0, 400, 0, 1);
    // Composite of sum alone: inputs input-0/input-1, output output-0.
    const composite = nf.createCompositeNode(["sum"])!;
    const definition = composite.composite!;

    const updated = nf.updateCompositeNode(composite.id, {
      ...definition,
      inputs: [definition.inputs[0]],
    })!;

    expect(updated.id).toBe(composite.id);
    expect(updated.composite!.inputs).toHaveLength(1);
    expect(updated.connectorSections.get("inputs")!.connectors.size).toBe(1);
    expect(allConnections(nf)).toEqual(
      [
        `a.output-0->${composite.id}.input-0`,
        `${composite.id}.output-0->display.input-0`,
      ].sort(),
    );
  });

  it("keeps group membership and is one undo step", () => {
    const nf = buildDemo();
    const composite = nf.createCompositeNode(["sum"])!;
    const group = nf.addGroup([composite.id, "display"], { title: "g" })!;
    const before = allConnections(nf);
    const definition = composite.composite!;

    nf.updateCompositeNode(composite.id, { ...definition, inputs: [] });

    expect(nf.getGroupOfNode(composite.id)?.id).toBe(group.id);
    expect(nf.nodes.get(composite.id)!.composite!.inputs).toHaveLength(0);

    nf.changes.undo();
    expect(nf.nodes.get(composite.id)!.composite!.inputs).toHaveLength(2);
    expect(allConnections(nf)).toEqual(before);
    expect(nf.getGroupOfNode(composite.id)?.id).toBe(group.id);
  });

  it("ignores plain nodes", () => {
    const nf = buildDemo();
    expect(
      nf.updateCompositeNode("sum", {
        nodes: {},
        connections: [],
        inputs: [],
        outputs: [],
      }),
    ).toBeUndefined();
  });
});

describe("composite serialization", () => {
  it("round-trips through serialize/deserialize", () => {
    const nf = buildDemo();
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    const data = JSON.parse(JSON.stringify(nf.serialize()));

    const copy = createNodeflow();
    copy.deserialize(data);
    const restored = copy.nodes.get(composite.id)!;

    expect(restored.composite).toEqual(
      JSON.parse(JSON.stringify(composite.composite)),
    );
    copy.explodeCompositeNode(composite.id);
    expect(allConnections(copy)).toEqual(
      [
        "a.output-0->sum.input-0",
        "b.output-0->sum.input-1",
        "sum.output-0->display.input-0",
      ].sort(),
    );
  });
});

describe("groups inside composite nodes", () => {
  it("moves groups lying inside the selection into the definition", () => {
    const nf = buildDemo();
    nf.addGroup(["a", "b"], { title: "Inputs" }, false);

    const composite = nf.createCompositeNode(["a", "b", "sum"])!;

    expect(composite.composite!.groups).toHaveLength(1);
    expect(composite.composite!.groups![0].title).toBe("Inputs");
    expect(composite.composite!.groups![0].nodeIds.sort()).toEqual(["a", "b"]);
    expect(nf.groups.size).toBe(0);
  });

  it("leaves partly selected and shared groups out of the definition", () => {
    const nf = buildDemo();
    nf.addGroup(["a", "b", "sum"], { title: "Shared" }, false);
    const composite = nf.createCompositeNode(["a", "b"])!;
    expect(composite.composite!.groups).toBeUndefined();
    expect(nf.getGroupOfNode(composite.id)?.title).toBe("Shared");

    const other = buildDemo();
    other.addGroup(["sum", "display"], { title: "Partial" }, false);
    expect(
      other.createCompositeNode(["a", "b", "sum"])!.composite!.groups,
    ).toBeUndefined();
  });

  it("restores inner groups when broken apart, as one undo step", () => {
    const nf = buildDemo();
    nf.addGroup(["a", "b"], { title: "Inputs" }, false);
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    nf.addGroup([composite.id, "display"], { title: "Outer" }, false);

    nf.explodeCompositeNode(composite.id);

    expect(nf.getGroupOfNode("a")?.title).toBe("Inputs");
    expect(nf.getGroupOfNode("b")?.title).toBe("Inputs");
    // The inner group takes its nodes; the rest join the composite's group.
    expect(nf.getGroupOfNode("sum")?.title).toBe("Outer");
    expect(nf.getGroupOfNode("display")?.title).toBe("Outer");

    nf.changes.undo();
    expect(nf.nodes.has(composite.id)).toBe(true);
    expect(nf.getGroupOfNode(composite.id)?.title).toBe("Outer");
    expect(Array.from(nf.groups.values()).map((group) => group.title)).toEqual([
      "Outer",
    ]);
  });

  it("drops the outer group when inner groups take every restored node", () => {
    const nf = buildDemo();
    nf.addGroup(["a", "b"], { title: "Inputs" }, false);
    nf.addGroup(["sum"], { title: "Sum" }, false);
    const composite = nf.createCompositeNode(["a", "b", "sum"])!;
    nf.addGroup([composite.id], { title: "Alone" }, false);

    nf.explodeCompositeNode(composite.id);

    expect(
      Array.from(nf.groups.values())
        .map((group) => group.title)
        .sort(),
    ).toEqual(["Inputs", "Sum"]);
  });
});
