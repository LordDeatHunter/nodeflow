import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";

export const createNodeDisplay =
  <P extends { node: any }>(Component: ComponentType<P>) =>
  ({ node }: { node: any }): HTMLElement => {
    const container = document.createElement("div");
    createRoot(container).render(<Component {...({ node } as P)} />);
    return container;
  };
