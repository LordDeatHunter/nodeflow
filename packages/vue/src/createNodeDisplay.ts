import { createApp } from "vue";
import type { Component } from "vue";

export const createNodeDisplay =
  (ComponentDef: Component, propsMapper?: (node: any) => Record<string, any>) =>
  ({ node }: { node: any }): HTMLElement => {
    const container = document.createElement("div");
    const props = propsMapper ? propsMapper(node) : { node };
    createApp(ComponentDef, props).mount(container);
    return container;
  };
