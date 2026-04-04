import "@nodeflow/core/style.css";
import { createVanillaNodeflow } from "@nodeflow/vanilla";

const container = document.getElementById("app")!;

const nodeflowData = createVanillaNodeflow("main", container);

interface DisplayNode {
  id: string;
  position: { x: number; y: number };
}

function nodeDisplay({ node }: { node: DisplayNode }): HTMLElement {
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
  Object.assign(subtitle.style, {
    opacity: "0.5",
    fontSize: "11px",
  });

  wrapper.appendChild(title);
  wrapper.appendChild(subtitle);
  return wrapper;
}

function addNode(x: number, y: number, inputs: number, outputs: number) {
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
}

const start = addNode(80, 100, 0, 2);
const config = addNode(80, 300, 0, 1);

const transform = addNode(380, 60, 2, 1);
const validate = addNode(380, 260, 2, 1);
const merge = addNode(380, 460, 1, 1);

const output = addNode(700, 160, 2, 1);
const logger = addNode(700, 400, 2, 0);

function connect(
  srcId: string,
  srcConnector: string,
  dstId: string,
  dstConnector: string,
) {
  nodeflowData.addConnection({
    sourceNodeId: srcId,
    sourceConnectorId: srcConnector,
    destinationNodeId: dstId,
    destinationConnectorId: dstConnector,
  });
}

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
