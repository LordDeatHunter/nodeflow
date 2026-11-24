import { computed } from "vue";
import type { NodeflowNodeData } from "@nodeflow-lib/vue";
import { markCircuitDirty, trackCircuit } from "../state";
import { simulationOf, trackSignals } from "../simulation";

/** Keeps a press or keystroke on a control from dragging or deleting nodes. */
export const stop = (event: Event) => event.stopPropagation();

/** The node's custom data, re-read whenever node data changes. */
export const useCustomData = (node: NodeflowNodeData) =>
  computed(() => {
    trackCircuit();
    return node.customData;
  });

export const updateCustomData = (
  node: NodeflowNodeData,
  patch: Partial<CustomNodeflowDataType>,
) => {
  node.customData = { ...node.customData, ...patch };
  markCircuitDirty();
};

/** Whether input `inputId` of `node` is high. */
export const inputLevel = (node: NodeflowNodeData, inputId: string) => {
  trackSignals();
  return simulationOf(node.nodeflow)?.inputLevel(node.id, inputId) ?? false;
};

/** Whether output `outputId` of `node` is high; `undefined` if undriven. */
export const outputLevel = (node: NodeflowNodeData, outputId: string) => {
  trackSignals();
  return simulationOf(node.nodeflow)?.outputLevel(node.id, outputId);
};
