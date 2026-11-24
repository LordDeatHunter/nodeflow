import { NodeflowSettings } from "@nodeflow-lib/solid";

// Matches the 24px minor dot grid in nodeflow.module.scss (major lines are
// every 5 cells).
export const GRID_SIZE = 24;

/** Settings shared by the main canvas and the derived-type editor. */
export const BLUEPRINT_SETTINGS: Partial<NodeflowSettings> = {
  defaultLineShape: "broken-elbow",
  gridSize: GRID_SIZE,
  snapNodePositionToGrid: true,
  snapNodeSizeToGrid: true,
  groupPadding: GRID_SIZE,
  groupHeaderHeight: 36,
};
