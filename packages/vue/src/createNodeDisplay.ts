import { createApp, type Component } from "vue";
import {
  onNodeDisplayUnmount,
  type NodeflowNodeData,
} from "@nodeflow-lib/vanilla";

export const createNodeDisplay =
  (
    ComponentDef: Component,
    propsMapper?: (node: NodeflowNodeData) => Record<string, unknown>,
  ) =>
  ({ node }: { node: NodeflowNodeData }): HTMLElement => {
    const container = document.createElement("div");
    const props = propsMapper ? propsMapper(node) : { node };
    const app = createApp(ComponentDef, props);
    app.mount(container);
    onNodeDisplayUnmount(container, () => app.unmount());
    return container;
  };
