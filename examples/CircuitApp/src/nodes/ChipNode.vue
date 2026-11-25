<script setup lang="ts">
import { computed } from "vue";
import type { CompositePort, NodeflowNodeData } from "@nodeflow-lib/vue";
import { breakApartChip, saveChipType } from "../circuit";
import { connectorNumber, describeNodeKind } from "../labels";
import { mainCanvas, trackCircuit } from "../state";
import {
  inputLevel,
  outputLevel,
  stop,
  updateCustomData,
  useCustomData,
} from "./common";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);

const ports = computed(() => {
  trackCircuit();
  return {
    inputs: props.node.composite?.inputs ?? [],
    outputs: props.node.composite?.outputs ?? [],
  };
});

const isSaved = computed(() => {
  trackCircuit();
  const id = data.value.templateId;
  // Saved types live on the main canvas, also for chips in the editor.
  return id !== undefined && !!mainCanvas.value?.templates.has(id);
});

/** What a port connects to inside, e.g. "NAND · in 2" ("+1" if it fans out). */
const describePort = (port: CompositePort, direction: "in" | "out") => {
  const inner = props.node.composite?.nodes[port.innerNodeId]?.customData;
  const extra = port.extraTargets?.length ?? 0;
  const label = `${describeNodeKind(inner)} · ${direction} ${connectorNumber(
    port.innerConnectorId,
  )}`;
  return extra > 0 ? `${label} +${extra}` : label;
};
</script>

<template>
  <div class="node-body node-body--chip">
    <input
      class="chip-name"
      :value="data.name ?? 'Chip'"
      aria-label="Chip name"
      @input="
        updateCustomData(node, {
          name: ($event.target as HTMLInputElement).value,
        })
      "
      @keydown="stop"
      @pointerdown="stop"
      @touchstart="stop"
      @mousedown="stop"
    />
    <div class="chip-ports">
      <ul class="port-list">
        <li v-for="port in ports.inputs" :key="port.id">
          <span
            class="led"
            :class="{ 'led--on': inputLevel(node, port.id) }"
            aria-hidden="true"
          />
          <span
            :class="{ 'port-name': port.name }"
            :title="describePort(port, 'in')"
          >
            {{ port.name ?? describePort(port, "in") }}
          </span>
        </li>
      </ul>
      <ul class="port-list port-list--outputs">
        <li v-for="port in ports.outputs" :key="port.id">
          <span
            :class="{ 'port-name': port.name }"
            :title="describePort(port, 'out')"
          >
            {{ port.name ?? describePort(port, "out") }}
          </span>
          <span
            class="led"
            :class="{ 'led--on': outputLevel(node, port.id) }"
            aria-hidden="true"
          />
        </li>
      </ul>
    </div>
    <div class="chip-actions">
      <button
        type="button"
        class="node-button"
        @pointerdown="stop"
        @touchstart="stop"
        @mousedown="stop"
        @click="breakApartChip(node.id, node.nodeflow)"
      >
        Break apart
      </button>
      <button
        type="button"
        class="node-button"
        @pointerdown="stop"
        @touchstart="stop"
        @mousedown="stop"
        @click="saveChipType(node.id, node.nodeflow)"
      >
        {{ isSaved ? "Update type" : "Save type" }}
      </button>
    </div>
  </div>
</template>
