import { drawflowEventStore } from "./events";

let setupDone = false;

export const setup = () => {
  if (setupDone) {
    return;
  }

  document.onmousemove = (event) =>
    drawflowEventStore.onMouseMoveInDocument.publish({ event });

  document.onpointerleave = (event) =>
    drawflowEventStore.onPointerLeaveFromDocument.publish({ event });

  document.onpointerup = (event) =>
    drawflowEventStore.onPointerUpInDocument.publish({ event });

  setupDone = true;
};

export const isSetupDone = (): Readonly<boolean> => setupDone;
