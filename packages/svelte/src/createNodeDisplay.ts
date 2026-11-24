import { mount, unmount, type Component } from "svelte";
import {
  onNodeDisplayUnmount,
  type NodeflowNodeData,
} from "@nodeflow-lib/vanilla";

export const createNodeDisplay =
  <Props extends object = { node: NodeflowNodeData }>(
    ComponentFn: Component<Props>,
    propsMapper?: (node: NodeflowNodeData) => Props,
  ) =>
  ({ node }: { node: NodeflowNodeData }): HTMLElement => {
    const container = document.createElement("div");
    // Without a mapper the component receives `{ node }`, matching the default Props.
    const props = propsMapper ? propsMapper(node) : ({ node } as Props);
    const instance = mount(ComponentFn, { target: container, props });
    onNodeDisplayUnmount(container, () => {
      void unmount(instance);
    });
    return container;
  };
