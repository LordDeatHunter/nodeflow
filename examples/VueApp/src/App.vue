<script setup lang="ts">
import { Nodeflow } from "@nodeflow/vue";
import type { NodeflowData } from "@nodeflow/vue";

function nodeDisplay({
  node,
}: {
  node: { id: string; position: { x: number; y: number } };
}): HTMLElement {
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

function addNode(
  data: NodeflowData,
  x: number,
  y: number,
  inputs: number,
  outputs: number,
) {
  const node = data.addNode({ position: { x, y }, display: nodeDisplay });
  if (inputs > 0) {
    const section = node.addConnectorSection({ id: "inputs" });
    for (let i = 0; i < inputs; i++) section.addConnector({ id: `in-${i}` });
  }
  if (outputs > 0) {
    const section = node.addConnectorSection({ id: "outputs" });
    for (let i = 0; i < outputs; i++) section.addConnector({ id: `out-${i}` });
  }
  return node;
}

function handleReady(data: NodeflowData) {
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
}
</script>

<template>
  <Nodeflow id="main" @ready="handleReady" />
</template>
