import {
  NodeflowRegistry,
  NodeflowData,
  NodeflowSettings,
} from "@nodeflow/core";
import { renderCanvas } from "./components/canvas";

export function createVanillaNodeflow(
  id: string,
  container: HTMLElement,
  options?: Partial<NodeflowSettings>,
): NodeflowData {
  const nodeflowData = NodeflowRegistry.get().createCanvas(id, options);

  document.onmousemove = (event) =>
    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.publish({
      event,
    });
  document.onpointerleave = (event) =>
    NodeflowRegistry.get().globalEventStore.onPointerLeaveFromDocument.publish({
      event,
    });
  document.onpointerup = (event) =>
    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.publish({
      event,
    });

  const nodeElements = new Map<string, HTMLDivElement>();
  renderCanvas(container, nodeflowData, nodeElements);

  return nodeflowData;
}
