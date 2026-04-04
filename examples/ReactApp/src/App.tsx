import { Nodeflow } from "@nodeflow/react";
import type { NodeflowData } from "@nodeflow/react";
import { createRoot } from "react-dom/client";

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

const nodeDisplay = ({
  node,
}: {
  node: { id: string; position: { x: number; y: number } };
}): HTMLElement => {
  const container = document.createElement("div");
  createRoot(container).render(<NodeCard node={node} />);
  return container;
};

const App = () => {
  const handleReady = (data: NodeflowData) => {
    const addNode = (x: number, y: number, inputs: number, outputs: number) => {
      const node = data.addNode({ position: { x, y }, display: nodeDisplay });
      if (inputs > 0) {
        const section = node.addConnectorSection({ id: "inputs" });
        for (let i = 0; i < inputs; i++)
          section.addConnector({ id: `in-${i}` });
      }
      if (outputs > 0) {
        const section = node.addConnectorSection({ id: "outputs" });
        for (let i = 0; i < outputs; i++)
          section.addConnector({ id: `out-${i}` });
      }
      return node;
    };

    const start = addNode(80, 100, 0, 2);
    const config = addNode(80, 300, 0, 1);
    const transform = addNode(380, 60, 2, 1);
    const validate = addNode(380, 260, 2, 1);
    const merge = addNode(380, 460, 1, 1);
    const output = addNode(700, 160, 2, 1);
    const logger = addNode(700, 400, 2, 0);

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

  return <Nodeflow id="main" onReady={handleReady} />;
};

export default App;
