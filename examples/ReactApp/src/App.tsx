import { useRef } from "react";
import { Nodeflow, createNodeDisplay } from "@nodeflow-lib/react";
import type { NodeflowData } from "@nodeflow-lib/react";

const NodeCard = ({
  node,
}: {
  node: { id: string; position: { x: number; y: number } };
}) => (
  <div
    style={{
      padding: "14px 18px",
      minWidth: "140px",
      background: "#16213e",
      borderRadius: "8px",
      border: "1px solid #0f3460",
      color: "#e2e2e2",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: "13px",
      lineHeight: "1.4",
    }}
  >
    <strong
      style={{
        display: "block",
        marginBottom: "2px",
        fontSize: "14px",
        color: "#fff",
      }}
    >
      {`Node ${node.id}`}
    </strong>
    <span style={{ opacity: "0.5", fontSize: "11px" }}>
      {`Position ${node.position.x.toFixed(0)}, ${node.position.y.toFixed(0)}`}
    </span>
  </div>
);

const nodeDisplay = createNodeDisplay(NodeCard);

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const App = () => {
  const dataRef = useRef<NodeflowData | null>(null);

  const addNode = (
    data: NodeflowData,
    x: number,
    y: number,
    inputs: number,
    outputs: number,
  ) => {
    const node = data.addNode({ position: { x, y }, display: nodeDisplay });
    if (inputs > 0) {
      const section = node.addConnectorSection({ id: "inputs" });
      for (let i = 0; i < inputs; i++) section.addConnector({ id: `in-${i}` });
    }
    if (outputs > 0) {
      const section = node.addConnectorSection({ id: "outputs" });
      for (let i = 0; i < outputs; i++)
        section.addConnector({ id: `out-${i}` });
    }
    return node;
  };

  const handleReady = (data: NodeflowData) => {
    dataRef.current = data;

    const start = addNode(data, 80, 100, 0, 2);
    const config = addNode(data, 80, 300, 0, 1);
    const transform = addNode(data, 380, 60, 2, 1);
    const validate = addNode(data, 380, 260, 2, 1);
    const merge = addNode(data, 380, 460, 1, 1);
    const output = addNode(data, 700, 160, 2, 1);
    const logger = addNode(data, 700, 400, 2, 0);

    data.addConnection({
      sourceNodeId: start.id,
      sourceConnectorId: "out-0",
      destinationNodeId: transform.id,
      destinationConnectorId: "in-0",
    });
    data.addConnection({
      sourceNodeId: start.id,
      sourceConnectorId: "out-1",
      destinationNodeId: validate.id,
      destinationConnectorId: "in-0",
    });
    data.addConnection({
      sourceNodeId: config.id,
      sourceConnectorId: "out-0",
      destinationNodeId: validate.id,
      destinationConnectorId: "in-1",
    });
    data.addConnection({
      sourceNodeId: transform.id,
      sourceConnectorId: "out-0",
      destinationNodeId: output.id,
      destinationConnectorId: "in-0",
    });
    data.addConnection({
      sourceNodeId: validate.id,
      sourceConnectorId: "out-0",
      destinationNodeId: output.id,
      destinationConnectorId: "in-1",
    });
    data.addConnection({
      sourceNodeId: merge.id,
      sourceConnectorId: "out-0",
      destinationNodeId: logger.id,
      destinationConnectorId: "in-0",
    });
    data.addConnection({
      sourceNodeId: output.id,
      sourceConnectorId: "out-0",
      destinationNodeId: logger.id,
      destinationConnectorId: "in-1",
    });
  };

  const addRandomNode = () => {
    const data = dataRef.current;
    if (!data) return;
    addNode(
      data,
      randInt(50, 800),
      randInt(50, 600),
      randInt(0, 3),
      randInt(0, 3),
    );
  };

  const addRandomConnection = () => {
    const data = dataRef.current;
    if (!data) return;
    const nodeIds = Array.from(data.nodes.keys());
    if (nodeIds.length < 2) return;

    for (let attempt = 0; attempt < 20; attempt++) {
      const srcId = nodeIds[randInt(0, nodeIds.length - 1)];
      const dstId = nodeIds[randInt(0, nodeIds.length - 1)];
      if (srcId === dstId) continue;

      const srcNode = data.nodes.get(srcId)!;
      const dstNode = data.nodes.get(dstId)!;

      const srcOutputs = srcNode
        .getAllConnectors()
        .filter((c) => c.parentSection.id === "outputs");
      const dstInputs = dstNode
        .getAllConnectors()
        .filter((c) => c.parentSection.id === "inputs");
      if (srcOutputs.length === 0 || dstInputs.length === 0) continue;

      const srcConn = srcOutputs[randInt(0, srcOutputs.length - 1)];
      const dstConn = dstInputs[randInt(0, dstInputs.length - 1)];

      data.addConnection({
        sourceNodeId: srcId,
        sourceConnectorId: srcConn.id,
        destinationNodeId: dstId,
        destinationConnectorId: dstConn.id,
      });
      break;
    }
  };

  return (
    <>
      <div className="toolbar">
        <button onClick={addRandomNode}>Add Random Node</button>
        <button onClick={addRandomConnection}>Add Random Connection</button>
      </div>
      <Nodeflow id="main" onReady={handleReady} />
    </>
  );
};

export default App;
