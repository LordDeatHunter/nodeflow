<script setup lang="ts">
import { shallowRef } from "vue";
import { Nodeflow, createNodeDisplay } from "@nodeflow/vue";
import type { NodeflowData } from "@nodeflow/vue";
import NodeCard from "./NodeCard.vue";

const nodeDisplay = createNodeDisplay(NodeCard, (node) => ({
  id: node.id,
  position: node.position,
}));

const dataRef = shallowRef<NodeflowData | null>(null);

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const addNode = (
  data: NodeflowData,
  x: number,
  y: number,
  inputs: number,
  outputs: number,
): ReturnType<NodeflowData["addNode"]> => {
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
};

const handleReady = (data: NodeflowData) => {
  dataRef.value = data;

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
  const data = dataRef.value;
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
  const data = dataRef.value;
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
</script>

<template>
  <div class="toolbar">
    <button @click="addRandomNode">Add Random Node</button>
    <button @click="addRandomConnection">Add Random Connection</button>
  </div>
  <Nodeflow id="main" @ready="handleReady" />
</template>
