import { describe, it, expect, vi } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import type { NodeTemplate } from "../src/nodeflow-types";

let testId = 0;

const Display = () => "display";

const buildComposite = (
  settings: Partial<NodeflowData["settings"]> = {},
) => {
  const nf = new NodeflowData(`test-templates-${++testId}`, settings);
  ["a", "b"].forEach((id, index) =>
    nf.addNode(
      {
        id,
        position: { x: index * 200, y: 0 },
        display: Display,
        customData: { kind: id } as unknown as CustomNodeflowDataType,
        connectorSections: {
          inputs: {
            id: "inputs",
            connectors: {
              "input-0": { id: "input-0", hovered: false, position: { x: 0, y: 0 } },
            },
          },
          outputs: {
            id: "outputs",
            connectors: {
              "output-0": { id: "output-0", hovered: false, position: { x: 0, y: 0 } },
            },
          },
        },
      },
      false,
    ),
  );
  nf.addConnection(
    {
      sourceNodeId: "a",
      sourceConnectorId: "output-0",
      destinationNodeId: "b",
      destinationConnectorId: "input-0",
    },
    false,
  );
  const composite = nf.createCompositeNode(["a", "b"], {
    display: Display,
    customData: { kind: "derived" } as unknown as CustomNodeflowDataType,
  })!;
  return { nf, composite };
};

describe("NodeTemplates", () => {
  it("saves a composite node and lists it", () => {
    const { nf, composite } = buildComposite();
    const template = nf.templates.saveFromNode(composite.id, "Pair", "pair")!;

    expect(template.id).toBe("pair");
    expect(nf.templates.list().map((t) => t.name)).toEqual(["Pair"]);
    expect(template.definition.inputs).toHaveLength(1);
    expect(template.node.position).toBeUndefined();
  });

  it("does not save plain nodes", () => {
    const nf = new NodeflowData(`test-templates-${++testId}`);
    nf.addNode({ id: "x" }, false);
    expect(nf.templates.saveFromNode("x", "X")).toBeUndefined();
  });

  it("toJSON strips display and is JSON-safe", () => {
    const { nf, composite } = buildComposite();
    nf.templates.saveFromNode(composite.id, "Pair", "pair");

    const json = nf.templates.toJSON();
    const text = JSON.stringify(json);

    expect(text).not.toContain("display");
    expect(JSON.parse(text)).toEqual(json);
    // The live template keeps its displays.
    expect(nf.templates.get("pair")!.node.display).toBe(Display);
  });

  it("fires onTemplatesChanged on every change", () => {
    const { nf, composite } = buildComposite();
    const listener = vi.fn();
    nf.eventStore.onTemplatesChanged.subscribe("test", listener);

    nf.templates.saveFromNode(composite.id, "Pair", "pair");
    nf.templates.rename("pair", "Renamed");
    nf.templates.remove("pair");

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[1][0].templates[0].name).toBe("Renamed");
  });

  it("instantiates loaded JSON templates, resolving displays", () => {
    const { nf, composite } = buildComposite();
    nf.templates.saveFromNode(composite.id, "Pair", "pair");
    const stored: Array<NodeTemplate> = JSON.parse(
      JSON.stringify(nf.templates.toJSON()),
    );

    const resolveNodeDisplay = vi.fn(() => Display);
    const fresh = new NodeflowData(`test-templates-${++testId}`, {
      resolveNodeDisplay,
    });
    fresh.templates.load(stored);

    const node = fresh.instantiateTemplate("pair", Vec2.of(10, 20))!;
    expect(node.isComposite).toBe(true);
    expect(node.display).toBe(Display);
    expect(node.position.equals(Vec2.of(10, 20))).toBe(true);
    expect(node.getConnector("input-0")).toBeDefined();
    expect(node.getConnector("output-0")).toBeDefined();

    const inner = fresh.explodeCompositeNode(node.id);
    expect(inner).toHaveLength(2);
    inner.forEach((innerNode) => expect(innerNode.display).toBe(Display));
    expect(resolveNodeDisplay).toHaveBeenCalled();
    // Listed once from each end.
    expect(fresh.serializeConnections()).toHaveLength(2);
  });

  it("load with replace drops existing templates", () => {
    const { nf, composite } = buildComposite();
    nf.templates.saveFromNode(composite.id, "One", "one");
    const json = nf.templates.toJSON();
    nf.templates.saveFromNode(composite.id, "Two", "two");

    nf.templates.load(json, { replace: true });
    expect(nf.templates.list().map((t) => t.id)).toEqual(["one"]);
  });

  it("instances do not share state with the template", () => {
    const { nf, composite } = buildComposite();
    nf.templates.saveFromNode(composite.id, "Pair", "pair");
    const node = nf.instantiateTemplate("pair", Vec2.zero())!;

    node.composite!.inputs.pop();
    expect(nf.templates.get("pair")!.definition.inputs).toHaveLength(1);
  });
});
