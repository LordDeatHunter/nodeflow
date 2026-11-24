<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { GATE_KINDS, type GateKind } from "../simulation";
import { setGateKind } from "../circuit";
import { outputLevel, stop, useCustomData } from "./common";
import GateSymbol from "../components/GateSymbol.vue";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const gate = computed<GateKind>(() => data.value.gate ?? "AND");
const high = computed(() => !!outputLevel(props.node, "output-0"));
</script>

<template>
  <div class="node-body node-body--gate">
    <GateSymbol :kind="gate" :on="high" />
    <select
      class="gate-kind"
      :value="gate"
      aria-label="Gate type"
      @change="
        setGateKind(node, ($event.target as HTMLSelectElement).value as GateKind)
      "
      @keydown="stop"
      @pointerdown="stop"
      @mousedown="stop"
    >
      <option v-for="kind in GATE_KINDS" :key="kind" :value="kind">
        {{ kind }}
      </option>
    </select>
  </div>
</template>
