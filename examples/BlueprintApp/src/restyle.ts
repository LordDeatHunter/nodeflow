import {
  NodeTemplate,
  SerializedCompositeDefinition,
  SerializedConnectorSection,
  SerializedNodeflowNode,
} from "@nodeflow-lib/solid";
import nodeCss from "./styles/node.module.scss";
import curveCss from "./styles/curve.module.scss";
import groupCss from "./styles/group.module.scss";

/*
 * Saved types store the CSS class names their nodes and connections had when
 * they were saved. Those are hashed CSS-module names, which change whenever a
 * stylesheet changes or between dev and production builds, so stored names
 * can point at classes that no longer exist (connections then render as
 * plain black lines). Saved types are restyled with the current classes,
 * by role, whenever they are loaded.
 */

const restyleSection = (
  section: SerializedConnectorSection,
): SerializedConnectorSection => {
  const isInputs = section.id === "inputs";
  return {
    ...section,
    css: isInputs ? nodeCss.inputsSection : nodeCss.outputsSection,
    connectors: Object.fromEntries(
      Object.entries(section.connectors).map(([id, connector]) => [
        id,
        {
          ...connector,
          css: isInputs ? nodeCss.inputConnector : nodeCss.outputConnector,
        },
      ]),
    ),
  };
};

const restyleNode = <T extends Partial<SerializedNodeflowNode>>(node: T): T => {
  const derived = node.customData?.type === "derived";
  return {
    ...node,
    css: {
      normal: derived ? `${nodeCss.node} ${nodeCss.derivedNode}` : nodeCss.node,
      selected: nodeCss.selectedNode,
    },
    connectorSections:
      node.connectorSections &&
      Object.fromEntries(
        Object.entries(node.connectorSections).map(([id, section]) => [
          id,
          restyleSection(section),
        ]),
      ),
    composite: node.composite && restyleDefinition(node.composite),
  };
};

const restyleDefinition = (
  definition: SerializedCompositeDefinition,
): SerializedCompositeDefinition => ({
  ...definition,
  nodes: Object.fromEntries(
    Object.entries(definition.nodes).map(([id, node]) => [
      id,
      restyleNode(node),
    ]),
  ),
  connections: definition.connections.map((connection) => ({
    ...connection,
    css: {
      normal: curveCss.connection,
      selected: curveCss.selectedConnection,
    },
  })),
  groups: definition.groups?.map((group) => ({
    ...group,
    css: {
      frame: groupCss.frame,
      header: groupCss.header,
      collapsed: groupCss.collapsed,
      selected: groupCss.selected,
    },
  })),
});

/** `template` with this build's CSS classes in place of the stored ones. */
export const restyleTemplate = (template: NodeTemplate): NodeTemplate => ({
  ...template,
  definition: restyleDefinition(template.definition),
  node: restyleNode(template.node),
});
