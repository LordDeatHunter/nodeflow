<script setup lang="ts">
import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { GATE_KINDS, gateInputCount, type GateKind } from "../simulation";
import { setGateKind } from "../circuit";
import { inputLevel, outputLevel, stop, useCustomData } from "./common";
import GateSymbol from "../components/GateSymbol.vue";
import { gateGeometry } from "../components/gateShape";

const props = defineProps<{ node: NodeflowNodeData }>();
const data = useCustomData(props.node);
const gate = computed<GateKind>(() => data.value.gate ?? "AND");
const high = computed(() => !!outputLevel(props.node, "output-0"));
const inputsOn = computed(() =>
  Array.from({ length: gateInputCount(gate.value) }, (_, i) =>
    inputLevel(props.node, `input-${i}`),
  ),
);
const label = computed(() => gateGeometry(gate.value).label);
</script>

<template>
  <div class="gate-node">
    <div class="part-stage">
      <GateSymbol :kind="gate" :on="high" :inputs-on="inputsOn" />
      <select
        class="gate-kind"
        :value="gate"
        :style="{ left: `${label.x}px`, top: `${label.y}px` }"
        aria-label="Gate type"
        @change="
          setGateKind(node, ($event.target as HTMLSelectElement).value as GateKind)
        "
        @keydown="stop"
        @pointerdown="stop"
        @touchstart="stop"
        @mousedown="stop"
      >
        <option v-for="kind in GATE_KINDS" :key="kind" :value="kind">
          {{ kind }}
        </option>
      </select>
    </div>
  </div>
</template>
