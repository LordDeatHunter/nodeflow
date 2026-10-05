import { NodeflowRegistry, NodeflowData } from "@nodeflow-lib/core";
import NodeflowCanvas from "./components/NodeflowCanvas";

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

export const createSolidNodeflow = (
  ...params: ConstructorParameters<typeof NodeflowData>
): [NodeflowData, ReturnType<typeof NodeflowCanvas>] => {
  const nodeflowData = NodeflowRegistry.get().createCanvas(...params);
  attachGlobalListeners();

  return [nodeflowData, NodeflowCanvas(nodeflowData)];
};
