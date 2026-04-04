import { NodeflowRegistry, NodeflowData } from "@nodeflow/core";
import NodeflowCanvas from "./components/NodeflowCanvas";

export function createSolidNodeflow(
  ...params: ConstructorParameters<typeof NodeflowData>
): [NodeflowData, ReturnType<typeof NodeflowCanvas>] {
  const nodeflowData = NodeflowRegistry.get().createCanvas(...params);

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

  return [nodeflowData, NodeflowCanvas(nodeflowData)];
}
