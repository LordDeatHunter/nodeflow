import type { Component } from "vue";
import {
  createNodeDisplay,
  type DisplayFunc,
  type SerializedNodeflowNode,
} from "@nodeflow-lib/vue";
import SwitchNode from "./SwitchNode.vue";
import ButtonNode from "./ButtonNode.vue";
import ClockNode from "./ClockNode.vue";
import GateNode from "./GateNode.vue";
import LampNode from "./LampNode.vue";
import HexNode from "./HexNode.vue";
import ChipNode from "./ChipNode.vue";
import TerminalNode from "./TerminalNode.vue";

const display = (component: Component): DisplayFunc =>
  createNodeDisplay(component, (node) => ({ node }));

export const DISPLAYS: Record<CustomNodeflowDataType["type"], DisplayFunc> = {
  switch: display(SwitchNode),
  button: display(ButtonNode),
  clock: display(ClockNode),
  gate: display(GateNode),
  lamp: display(LampNode),
  hex: display(HexNode),
  chip: display(ChipNode),
  terminal: display(TerminalNode),
};

/**
 * Picks a node's display from its type. Saved chip types are stored as JSON,
 * which cannot hold components, so core asks for them when spawning.
 */
export const resolveNodeDisplay = (
  node: Partial<SerializedNodeflowNode>,
): DisplayFunc | undefined =>
  node.customData ? DISPLAYS[node.customData.type] : undefined;
