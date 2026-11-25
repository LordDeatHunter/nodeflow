<script setup lang="ts">
import { computed } from "vue";
import { Changes, type NodeflowNodeData } from "@nodeflow-lib/vue";
import { INPUT_CONNECTOR_CSS, OUTPUT_CONNECTOR_CSS } from "../circuit";
import { markCircuitDirty, trackCircuit } from "../state";
import { inputLevel, stop, useCustomData } from "./common";

/*
 * A side of the chip type being edited: the "Inputs" terminal sits left and
 * offers one output per input pin, the "Outputs" terminal sits right and
 * takes one input per output pin. Pins can be added and removed freely;
 * unused ones are dropped when the type is saved.
 */
const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);

const isInputs = computed(() => data.value.side !== "outputs");
// Inputs offer their pins as outputs, and vice versa.
const sectionId = computed(() => (isInputs.value ? "outputs" : "inputs"));

const portIds = computed(() => {
  trackCircuit();
  return Array.from(
    props.node.connectorSections.get(sectionId.value)?.connectors.keys() ?? [],
  );
});

const portNames = computed(() => data.value.portNames ?? {});

/** Sets a pin's name; a blank name drops it. */
const setPortName = (portId: string, name: string | undefined) => {
  const { [portId]: _old, ...rest } = props.node.customData.portNames ?? {};
  props.node.customData = {
    ...props.node.customData,
    portNames: name?.trim() ? { ...rest, [portId]: name } : rest,
  };
  markCircuitDirty();
};

const addPort = () => {
  const section = props.node.connectorSections.get(sectionId.value);
  if (!section) return;
  const id = `port-${section.connectors.size}`;
  // A pin re-added under a removed one's id starts unnamed.
  setPortName(id, undefined);
  section.addConnector({
    id,
    css: isInputs.value ? OUTPUT_CONNECTOR_CSS : INPUT_CONNECTOR_CSS,
  });
  markCircuitDirty();
};

/** Removes the last pin and its wires as one undo step. */
const removePort = () => {
  const section = props.node.connectorSections.get(sectionId.value);
  const lastId = portIds.value.at(-1);
  if (!section || lastId === undefined) return;

  const nodeflow = props.node.nodeflow;
  const historyGroup = Changes.createHistoryGroup();
  const wires = isInputs.value
    ? props.node.getAllDestinationConnections()
    : props.node.getAllSourceConnections();

  wires
    .filter((wire) =>
      isInputs.value
        ? wire.sourceConnectorId === lastId
        : wire.destinationConnectorId === lastId,
    )
    .forEach((wire) =>
      nodeflow.removeConnection(
        wire.sourceNodeId,
        wire.sourceConnectorId,
        wire.destinationNodeId,
        wire.destinationConnectorId,
        historyGroup,
      ),
    );
  section.removeConnector(lastId, historyGroup);
  setPortName(lastId, undefined);
  markCircuitDirty();
};
</script>

<template>
  <div class="terminal-root">
    <div class="terminal-header">
      <span class="node-label">{{ isInputs ? "Inputs" : "Outputs" }}</span>
      <div class="terminal-buttons">
        <button
          type="button"
          class="terminal-button"
          title="Remove the last pin"
          aria-label="Remove the last pin"
          :disabled="portIds.length === 0"
          @pointerdown="stop"
          @touchstart="stop"
          @mousedown="stop"
          @click="removePort"
        >
          −
        </button>
        <button
          type="button"
          class="terminal-button"
          title="Add a pin"
          aria-label="Add a pin"
          @pointerdown="stop"
          @touchstart="stop"
          @mousedown="stop"
          @click="addPort"
        >
          +
        </button>
      </div>
    </div>
    <ul
      class="terminal-ports"
      :class="{ 'terminal-ports--right': isInputs }"
    >
      <li v-for="(id, index) in portIds" :key="id">
        <span
          v-if="!isInputs"
          class="led"
          :class="{ 'led--on': inputLevel(node, id) }"
          aria-hidden="true"
        />
        <input
          class="port-name-input"
          :value="portNames[id] ?? ''"
          :placeholder="`${isInputs ? 'in' : 'out'} ${index + 1}`"
          :aria-label="`Name of ${isInputs ? 'input' : 'output'} ${index + 1}`"
          @input="setPortName(id, ($event.target as HTMLInputElement).value)"
          @keydown="stop"
          @pointerdown="stop"
          @touchstart="stop"
          @mousedown="stop"
        />
      </li>
    </ul>
  </div>
</template>
