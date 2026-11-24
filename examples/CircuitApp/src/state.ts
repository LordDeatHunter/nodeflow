import { ref, shallowRef } from "vue";
import type { NodeflowData } from "@nodeflow-lib/vue";

/*
 * Every node display is mounted as its own Vue app by `createNodeDisplay`,
 * and is never re-created when its node changes. Displays read the node from
 * core directly, so they track these module-level refs to know when to read
 * it again. Refs from the same `vue` module are shared across apps.
 */

const revision = ref(0);

/** Read inside a display or computed to re-run it when node data changes. */
export const trackCircuit = () => revision.value;

/** Marks node data (names, gate kinds, ports, saved types…) as changed. */
export const markCircuitDirty = () => {
  revision.value++;
};

/** The main canvas, set once its `Nodeflow` component is ready. */
export const mainCanvas = shallowRef<NodeflowData | undefined>();

/** The main canvas; throws if it isn't mounted yet. */
export const getMainCanvas = (): NodeflowData => {
  if (!mainCanvas.value) throw new Error("The main canvas isn't ready yet.");
  return mainCanvas.value;
};
