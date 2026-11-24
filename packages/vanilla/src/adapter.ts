import {
  NodeflowRegistry,
  NodeflowData,
  NodeflowSettings,
} from "@nodeflow-lib/core";
import "@nodeflow-lib/core/style.css";
import {
  disposeCanvas,
  renderCanvas,
  RenderCanvasOptions,
} from "./components/canvas";

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
  canvasOptions?: RenderCanvasOptions,
): NodeflowData => {
  const nodeflowData = NodeflowRegistry.get().createCanvas(id, options);
  attachGlobalListeners();

  const nodeElements = new Map<string, HTMLDivElement>();
  renderCanvas(container, nodeflowData, nodeElements, canvasOptions);

  return nodeflowData;
};

/**
 * Removes a canvas created by `createVanillaNodeflow`: stops its rendering,
 * removes its element and unregisters it.
 */
export const destroyVanillaNodeflow = (nodeflowData: NodeflowData): void => {
  disposeCanvas(nodeflowData);
  const registry = NodeflowRegistry.get();
  if (registry.getNodeflow(nodeflowData.id) === nodeflowData) {
    registry.removeNodeflow(nodeflowData.id);
  }
};
