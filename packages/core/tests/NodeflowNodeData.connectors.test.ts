import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import NodeflowNodeData from "../src/NodeflowNodeData";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CustomNodeflowDataType {}
}

let testId = 0;
const createNodeflow = (): NodeflowData =>
  new NodeflowData(`test-nodeflow-connectors-${++testId}`);

const addNode = (
  nodeflow: NodeflowData,
  params: Parameters<typeof nodeflow.addNode>[0] = {},
): NodeflowNodeData => nodeflow.addNode(params, false);

describe("NodeflowNodeData – getAllConnectors()", () => {
  it("returns empty array for a node with no sections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "no-sections" });

    expect(node.getAllConnectors()).toEqual([]);
  });

  it("returns all connectors across multiple sections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "multi-sections" });

    node.addConnectorSection({ id: "s1" }, false);
    node.addConnectorSection({ id: "s2" }, false);
    node.addConnectorSection({ id: "s3" }, false);

    node.addConnector("s1", { id: "c1" }, false);
    node.addConnector("s1", { id: "c2" }, false);
    node.addConnector("s2", { id: "c3" }, false);
    node.addConnector("s2", { id: "c4" }, false);
    node.addConnector("s3", { id: "c5" }, false);
    node.addConnector("s3", { id: "c6" }, false);

    expect(node.getAllConnectors()).toHaveLength(6);
  });

  it("returns the exact same connector instances that are stored in the sections", () => {
    const nf = createNodeflow();
    const node = addNode(nf, { id: "ref-check" });

    node.addConnectorSection({ id: "sec" }, false);
    node.addConnector("sec", { id: "conn-a" }, false);
    node.addConnector("sec", { id: "conn-b" }, false);

    const section = node.connectorSections.get("sec")!;
    const connectorA = section.connectors.get("conn-a")!;
    const connectorB = section.connectors.get("conn-b")!;

    const all = node.getAllConnectors();

    expect(all).toContain(connectorA);
    expect(all).toContain(connectorB);
  });
});

describe("NodeflowNodeData – getAllSourceConnections()", () => {
  let nf: NodeflowData;
  let node: NodeflowNodeData;

  beforeEach(() => {
    nf = createNodeflow();
    node = addNode(nf, { id: "loop-node" });
    node.addConnectorSection({ id: "src-sec" }, false);
    node.addConnectorSection({ id: "dst-sec" }, false);
    node.addConnector("src-sec", { id: "src-conn" }, false);
    node.addConnector("dst-sec", { id: "dst-conn" }, false);
  });

  it("returns the self-loop connection when source and destination are connectors on the same node", () => {
    nf.addConnection(
      {
        sourceNodeId: node.id,
        sourceConnectorId: "src-conn",
        destinationNodeId: node.id,
        destinationConnectorId: "dst-conn",
      },
      false,
    );

    const connections = node.getAllSourceConnections();

    expect(connections).toHaveLength(1);
    expect(connections[0].sourceNodeId).toBe(node.id);
    expect(connections[0].sourceConnectorId).toBe("src-conn");
    expect(connections[0].destinationNodeId).toBe(node.id);
    expect(connections[0].destinationConnectorId).toBe("dst-conn");
  });

  it("returns connections coming in from other nodes, with their styling", () => {
    const parent = addNode(nf, { id: "parent" });
    parent.addConnectorSection({ id: "out-sec" }, false);
    parent.addConnector("out-sec", { id: "out" }, false);

    nf.addConnection(
      {
        sourceNodeId: "parent",
        sourceConnectorId: "out",
        destinationNodeId: node.id,
        destinationConnectorId: "dst-conn",
        css: { normal: "line", selected: "line-selected" },
        dash: "dotted",
      },
      false,
    );

    expect(node.getAllSourceConnections()).toEqual([
      {
        sourceNodeId: "parent",
        sourceConnectorId: "out",
        destinationNodeId: node.id,
        destinationConnectorId: "dst-conn",
        css: { normal: "line", selected: "line-selected" },
        shape: undefined,
        dash: "dotted",
      },
    ]);
  });

  it("does not return connections going out to other nodes", () => {
    const child = addNode(nf, { id: "child" });
    child.addConnectorSection({ id: "in-sec" }, false);
    child.addConnector("in-sec", { id: "in" }, false);

    nf.addConnection(
      {
        sourceNodeId: node.id,
        sourceConnectorId: "src-conn",
        destinationNodeId: "child",
        destinationConnectorId: "in",
      },
      false,
    );

    expect(node.getAllSourceConnections()).toEqual([]);
    expect(child.getAllSourceConnections()).toHaveLength(1);
    expect(child.getAllSourceConnections()[0].sourceNodeId).toBe(node.id);
  });

  it("returns one entry per connection when a source feeds several of the node's connectors", () => {
    const parent = addNode(nf, { id: "parent" });
    parent.addConnectorSection({ id: "out-sec" }, false);
    parent.addConnector("out-sec", { id: "out" }, false);

    nf.addConnection(
      {
        sourceNodeId: "parent",
        sourceConnectorId: "out",
        destinationNodeId: node.id,
        destinationConnectorId: "src-conn",
        dash: "solid",
      },
      false,
    );
    nf.addConnection(
      {
        sourceNodeId: "parent",
        sourceConnectorId: "out",
        destinationNodeId: node.id,
        destinationConnectorId: "dst-conn",
        dash: "dashed",
      },
      false,
    );

    const connections = node
      .getAllSourceConnections()
      .map(({ destinationConnectorId, dash }) => ({
        destinationConnectorId,
        dash,
      }))
      .sort((a, b) =>
        a.destinationConnectorId.localeCompare(b.destinationConnectorId),
      );

    expect(connections).toEqual([
      { destinationConnectorId: "dst-conn", dash: "dashed" },
      { destinationConnectorId: "src-conn", dash: "solid" },
    ]);
  });
});

describe("NodeflowNodeData – getAllDestinationConnections()", () => {
  let nf: NodeflowData;
  let node: NodeflowNodeData;
  let target: NodeflowNodeData;

  beforeEach(() => {
    nf = createNodeflow();
    node = addNode(nf, { id: "source-node" });
    node.addConnectorSection({ id: "out-sec" }, false);
    node.addConnector("out-sec", { id: "out-a" }, false);
    node.addConnector("out-sec", { id: "out-b" }, false);

    target = addNode(nf, { id: "target" });
    target.addConnectorSection({ id: "in-sec" }, false);
    target.addConnector("in-sec", { id: "in" }, false);
  });

  it("returns connections going out to other nodes, with their styling", () => {
    nf.addConnection(
      {
        sourceNodeId: node.id,
        sourceConnectorId: "out-a",
        destinationNodeId: "target",
        destinationConnectorId: "in",
        css: { normal: "line", selected: "line-selected" },
        dash: "dotted",
      },
      false,
    );

    expect(node.getAllDestinationConnections()).toEqual([
      {
        sourceNodeId: node.id,
        sourceConnectorId: "out-a",
        destinationNodeId: "target",
        destinationConnectorId: "in",
        css: { normal: "line", selected: "line-selected" },
        shape: undefined,
        dash: "dotted",
      },
    ]);
  });

  it("does not return connections coming in from other nodes", () => {
    target.addConnector("in-sec", { id: "back-out" }, false);
    node.addConnector("out-sec", { id: "back-in" }, false);

    nf.addConnection(
      {
        sourceNodeId: "target",
        sourceConnectorId: "back-out",
        destinationNodeId: node.id,
        destinationConnectorId: "back-in",
      },
      false,
    );

    expect(node.getAllDestinationConnections()).toEqual([]);
    expect(target.getAllDestinationConnections()).toHaveLength(1);
  });

  it("returns one entry per connection when several of the node's connectors feed the same connector", () => {
    nf.addConnection(
      {
        sourceNodeId: node.id,
        sourceConnectorId: "out-a",
        destinationNodeId: "target",
        destinationConnectorId: "in",
        dash: "solid",
      },
      false,
    );
    nf.addConnection(
      {
        sourceNodeId: node.id,
        sourceConnectorId: "out-b",
        destinationNodeId: "target",
        destinationConnectorId: "in",
        dash: "dashed",
      },
      false,
    );

    const connections = node
      .getAllDestinationConnections()
      .map(({ sourceConnectorId, dash }) => ({ sourceConnectorId, dash }))
      .sort((a, b) => a.sourceConnectorId.localeCompare(b.sourceConnectorId));

    expect(connections).toEqual([
      { sourceConnectorId: "out-a", dash: "solid" },
      { sourceConnectorId: "out-b", dash: "dashed" },
    ]);
  });
});
