import type { NodeflowCss, NodeflowSettings } from "@nodeflow-lib/vue";
import { resolveNodeDisplay } from "./nodes/displays";
import { CIRCUIT_SETTINGS } from "./settings";

/** Options for both canvases' `Nodeflow` components. */
export const CANVAS_OPTIONS: Partial<NodeflowSettings> = {
  ...CIRCUIT_SETTINGS,
  resolveNodeDisplay,
};

export const CANVAS_CSS: NodeflowCss = {
  nodeflow: "circuit-canvas",
  getNewCurveCss: () => "wire wire--new",
};
