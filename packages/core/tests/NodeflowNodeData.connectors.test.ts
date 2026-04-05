import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import NodeflowNodeData from "../src/NodeflowNodeData";

declare global {
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
});
