import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import {
  onNodeDisplayUnmount,
  type NodeflowNodeData,
} from "@nodeflow-lib/vanilla";

export const createNodeDisplay =
  (Component: ComponentType<{ node: NodeflowNodeData }>) =>
  ({ node }: { node: NodeflowNodeData }): HTMLElement => {
    const container = document.createElement("div");
    const root = createRoot(container);
    root.render(<Component node={node} />);
    onNodeDisplayUnmount(container, () => root.unmount());
    return container;
  };
