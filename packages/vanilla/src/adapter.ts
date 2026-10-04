import {
  NodeflowRegistry,
  NodeflowData,
  NodeflowSettings,
} from "@nodeflow/core";
import "@nodeflow/core/style.css";
import { renderCanvas } from "./components/canvas";

let globalListenersAttached = false;

const attachGlobalListeners = () => {
  if (globalListenersAttached) return;
  globalListenersAttached = true;

  const registry = NodeflowRegistry.get();

  document.addEventListener("mousemove", (event) =>
    registry.globalEventStore.onMouseMoveInDocument.publish({ event }),
  );
  document.addEventListener("pointerleave", (event) =>
    registry.globalEventStore.onPointerLeaveFromDocument.publish({ event }),
  );
  document.addEventListener("pointerup", (event) =>
    registry.globalEventStore.onPointerUpInDocument.publish({ event }),
  );
};

export const createVanillaNodeflow = (
  id: string,
  container: HTMLElement,
  options?: Partial<NodeflowSettings>,
): NodeflowData => {
  const nodeflowData = NodeflowRegistry.get().createCanvas(id, options);
  attachGlobalListeners();

  const nodeElements = new Map<string, HTMLDivElement>();
  renderCanvas(container, nodeflowData, nodeElements);

  return nodeflowData;
};
