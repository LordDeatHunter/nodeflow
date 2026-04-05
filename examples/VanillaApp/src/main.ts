import "@nodeflow/core/style.css";
import { createVanillaNodeflow } from "@nodeflow/vanilla";

const container = document.getElementById("app")!;

const nodeflowData = createVanillaNodeflow("main", container);

interface DisplayNode {
  id: string;
  position: { x: number; y: number };
}

const nodeDisplay = ({ node }: { node: DisplayNode }): HTMLElement => {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    padding: "14px 18px",
    minWidth: "140px",
    background: "#16213e",
    borderRadius: "8px",
    border: "1px solid #0f3460",
    color: "#e2e2e2",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: "13px",
    lineHeight: "1.4",
  });

  const title = document.createElement("strong");
  title.textContent = `Node ${node.id}`;
  Object.assign(title.style, {
    display: "block",
    marginBottom: "2px",
    fontSize: "14px",
    color: "#fff",
  });

  const subtitle = document.createElement("span");
  subtitle.textContent = `Position ${node.position.x.toFixed(
    0,
  )}, ${node.position.y.toFixed(0)}`;
  Object.assign(subtitle.style, { opacity: "0.5", fontSize: "11px" });

  wrapper.appendChild(title);
  wrapper.appendChild(subtitle);
  return wrapper;
};

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const addNode = (x: number, y: number, inputs: number, outputs: number) => {
  const node = nodeflowData.addNode({
    position: { x, y },
    display: nodeDisplay,
  });

  if (inputs > 0) {
    const section = node.addConnectorSection({ id: "inputs" });
    for (let i = 0; i < inputs; i++) {
      section.addConnector({ id: `in-${i}` });
    }
  }

  if (outputs > 0) {
    const section = node.addConnectorSection({ id: "outputs" });
    for (let i = 0; i < outputs; i++) {
      section.addConnector({ id: `out-${i}` });
    }
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

const connect = (
  srcId: string,
  srcConnector: string,
  dstId: string,
  dstConnector: string,
) => {
  nodeflowData.addConnection({
    sourceNodeId: srcId,
    sourceConnectorId: srcConnector,
    destinationNodeId: dstId,
    destinationConnectorId: dstConnector,
  });
};

// start → transform, validate
connect(start.id, "out-0", transform.id, "in-0");
connect(start.id, "out-1", validate.id, "in-0");

// config → validate
connect(config.id, "out-0", validate.id, "in-1");

// transform → output
connect(transform.id, "out-0", output.id, "in-0");

// validate → output
connect(validate.id, "out-0", output.id, "in-1");

// merge → logger
connect(merge.id, "out-0", logger.id, "in-0");

// output → logger
connect(output.id, "out-0", logger.id, "in-1");

const addRandomNode = () => {
  addNode(randInt(50, 800), randInt(50, 600), randInt(0, 3), randInt(0, 3));
};

const addRandomConnection = () => {
  const nodeIds = Array.from(nodeflowData.nodes.keys());
  if (nodeIds.length < 2) return;

  for (let attempt = 0; attempt < 20; attempt++) {
    const srcId = nodeIds[randInt(0, nodeIds.length - 1)];
    const dstId = nodeIds[randInt(0, nodeIds.length - 1)];
    if (srcId === dstId) continue;

    const srcNode = nodeflowData.nodes.get(srcId)!;
    const dstNode = nodeflowData.nodes.get(dstId)!;

    const srcOutputs = srcNode
      .getAllConnectors()
      .filter((c) => c.parentSection.id === "outputs");
    const dstInputs = dstNode
      .getAllConnectors()
      .filter((c) => c.parentSection.id === "inputs");
    if (srcOutputs.length === 0 || dstInputs.length === 0) continue;

    const srcConn = srcOutputs[randInt(0, srcOutputs.length - 1)];
    const dstConn = dstInputs[randInt(0, dstInputs.length - 1)];

    nodeflowData.addConnection({
      sourceNodeId: srcId,
      sourceConnectorId: srcConn.id,
      destinationNodeId: dstId,
      destinationConnectorId: dstConn.id,
    });
    break;
  }
};

document
  .getElementById("btn-add-node")
  ?.addEventListener("click", addRandomNode);
document
  .getElementById("btn-add-connection")
  ?.addEventListener("click", addRandomConnection);
