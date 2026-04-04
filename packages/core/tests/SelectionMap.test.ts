import { describe, it, expect } from "bun:test";
import SelectionMap from "../../../src/utils/SelectionMap";
import NodeflowData from "../../../src/utils/data/NodeflowData";
import { SelectableElementType } from "../../../src/nodeflow-types";

let testId = 0;
function createNodeflow(): NodeflowData {
  return new NodeflowData(`test-sm-${++testId}`);
}

describe("SelectionMap – default state", () => {
  it("starts with nothing selected (size === 0)", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    expect(sm.size).toBe(0);
  });

  it("selectedNodes is empty on construction", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    expect(sm.selectedNodes).toEqual([]);
  });

  it("selectedNodeflow is false on construction", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    expect(sm.selectedNodeflow).toBe(false);
  });
});

describe("SelectionMap – adding a node", () => {
  it("addNode makes the node appear in selectedNodes", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "node-a" }, false);

    sm.addNode(node);

    expect(sm.selectedNodes.length).toBe(1);
    expect(sm.selectedNodes[0].id).toBe("node-a");
  });

  it("isNodeSelected returns true after addNode", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "node-b" }, false);

    sm.addNode(node);

    expect(sm.isNodeSelected("node-b")).toBe(true);
  });

  it("size increments when adding a node", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "node-size" }, false);

    expect(sm.size).toBe(0);
    sm.addNode(node);
    expect(sm.size).toBe(1);
  });
});

describe("SelectionMap – removing a node", () => {
  it("delete removes a node from selectedNodes", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "node-del" }, false);

    sm.addNode(node);
    expect(sm.selectedNodes.length).toBe(1);

    sm.delete({ node, type: SelectableElementType.Node });
    expect(sm.selectedNodes.length).toBe(0);
  });

  it("isNodeSelected returns false after delete", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "node-check" }, false);

    sm.addNode(node);
    expect(sm.isNodeSelected("node-check")).toBe(true);

    sm.delete({ node, type: SelectableElementType.Node });
    expect(sm.isNodeSelected("node-check")).toBe(false);
  });
});

describe("SelectionMap – has / isSelected", () => {
  it("has() returns false for a node that was never added", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "orphan" }, false);

    expect(sm.has({ node, type: SelectableElementType.Node })).toBe(false);
  });

  it("has() returns true after the node is added", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "present" }, false);

    sm.addNode(node);
    expect(sm.has({ node, type: SelectableElementType.Node })).toBe(true);
  });
});

describe("SelectionMap – clear()", () => {
  it("clear() empties selectedNodes", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node1 = nf.addNode({ id: "clear-1" }, false);
    const node2 = nf.addNode({ id: "clear-2" }, false);

    sm.addNode(node1);
    sm.addNode(node2);
    expect(sm.selectedNodes.length).toBe(2);

    sm.clear();
    expect(sm.selectedNodes.length).toBe(0);
  });

  it("clear() resets size to 0", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "clr-size" }, false);

    sm.addNode(node);
    sm.addNodeflow();
    expect(sm.size).toBe(2);

    sm.clear();
    expect(sm.size).toBe(0);
  });

  it("clearNodes() only removes nodes, leaving nodeflow flag intact", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const node = nf.addNode({ id: "clr-n" }, false);

    sm.addNode(node);
    sm.addNodeflow();
    sm.clearNodes();

    expect(sm.selectedNodes.length).toBe(0);
    expect(sm.selectedNodeflow).toBe(true);
  });
});

describe("SelectionMap – multiple selections", () => {
  it("adding multiple nodes all appear in selectedNodes", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const nodeA = nf.addNode({ id: "multi-a" }, false);
    const nodeB = nf.addNode({ id: "multi-b" }, false);
    const nodeC = nf.addNode({ id: "multi-c" }, false);

    sm.addNode(nodeA);
    sm.addNode(nodeB);
    sm.addNode(nodeC);

    const ids = sm.selectedNodes.map((n) => n.id).sort();
    expect(ids).toEqual(["multi-a", "multi-b", "multi-c"]);
  });

  it("size reflects all selected types combined", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const nodeA = nf.addNode({ id: "sz-a" }, false);
    const nodeB = nf.addNode({ id: "sz-b" }, false);

    sm.addNode(nodeA);
    sm.addNode(nodeB);
    sm.addNodeflow();

    expect(sm.size).toBe(3);
  });
});

describe("SelectionMap – nodeflow selection", () => {
  it("addNodeflow sets selectedNodeflow to true", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);

    sm.addNodeflow();
    expect(sm.selectedNodeflow).toBe(true);
    expect(sm.hasSelectedNodeflow()).toBe(true);
  });

  it("clearNodeflow resets selectedNodeflow to false", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);

    sm.addNodeflow();
    sm.clearNodeflow();
    expect(sm.selectedNodeflow).toBe(false);
  });
});

describe("SelectionMap – deleteNodes(predicate)", () => {
  it("removes only nodes matching the predicate", () => {
    const nf = createNodeflow();
    const sm = new SelectionMap(nf);
    const nodeA = nf.addNode({ id: "del-a" }, false);
    const nodeB = nf.addNode({ id: "del-b" }, false);

    sm.addNode(nodeA);
    sm.addNode(nodeB);

    sm.deleteNodes((n) => n.id === "del-a");

    expect(sm.isNodeSelected("del-a")).toBe(false);
    expect(sm.isNodeSelected("del-b")).toBe(true);
    expect(sm.selectedNodes.length).toBe(1);
  });
});
