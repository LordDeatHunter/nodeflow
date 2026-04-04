<script setup lang="ts">
import { Nodeflow } from "@nodeflow/vue";
import type { NodeflowData } from "@nodeflow/vue";
import { createApp } from "vue";
import NodeCard from "./NodeCard.vue";

const nodeDisplay = ({
  node,
}: {
  node: { id: string; position: { x: number; y: number } };
}): HTMLElement => {
  const wrapper = document.createElement("div");
  createApp(NodeCard, {
    id: node.id,
    position: node.position,
  }).mount(wrapper);
  return wrapper;
};

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
</script>

<template>
  <Nodeflow id="main" @ready="handleReady" />
</template>
