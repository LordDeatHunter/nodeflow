import { mount } from "svelte";
import type { Component } from "svelte";

export const createNodeDisplay =
  (
    ComponentFn: Component<any>,
    propsMapper?: (node: any) => Record<string, any>,
  ) =>
  ({ node }: { node: any }): HTMLElement => {
    const container = document.createElement("div");
    const props = propsMapper ? propsMapper(node) : { node };
    mount(ComponentFn, { target: container, props });
    return container;
  };
