import type { NodeflowSettings } from "@nodeflow-lib/vue";

// Matches the 24px minor dot grid drawn by backgroundGrid.ts (major lines
// are every 5 cells).
export const GRID_SIZE = 24;

/** Settings shared by the main canvas and the chip editor. */
export const CIRCUIT_SETTINGS: Partial<NodeflowSettings> = {
  // Right-angled wires, like traces on a circuit board.
  defaultLineShape: "broken-elbow",
  gridSize: GRID_SIZE,
  snapNodePositionToGrid: true,
  snapNodeSizeToGrid: true,
  groupPadding: GRID_SIZE,
  groupHeaderHeight: 36,
};
