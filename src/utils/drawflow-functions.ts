import {
  Constants,
  deselectNode,
  drawflow,
  heldKeys,
  mouseData,
  nodes,
  removeNode,
  resetMovement,
  setDrawflow,
  setMouseData,
  updateBackgroundPosition,
  updateZoom,
} from "./drawflow-storage";
import { windowSize } from "./screen-utils";
import { Vec2 } from "./vec2";

export const onMouseMove = (e: MouseEvent) => {
  setMouseData("mousePosition", new Vec2(e.clientX, e.clientY));
  updateBackgroundPosition(new Vec2(e.movementX, e.movementY));
};

export const onPointerUp = () => {
  setMouseData((prev) => ({
    draggingNode: false,
    heldOutputId: undefined,
    heldNodeId: prev.heldOutputId ? undefined : prev.heldNodeId,
  }));
};

export const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  updateZoom(-e.deltaY, new Vec2(e.clientX, e.clientY));
};

export const onMouseDown = (e: MouseEvent) => {
  e.stopPropagation();
  resetMovement();
  setMouseData({
    draggingNode: true,
    heldNodeId: undefined,
    mousePosition: new Vec2(e.clientX, e.clientY),
    startPosition: new Vec2(
      e.clientX / drawflow.zoomLevel - drawflow.position.x,
      e.clientY / drawflow.zoomLevel - drawflow.position.y,
    ),
  });
};

export const onKeyDown = (e: KeyboardEvent) => {
  switch (e.code) {
    case "Delete":
      if (mouseData.heldNodeId) {
        removeNode(mouseData.heldNodeId);
      }
      break;
    case "Escape":
      deselectNode();
      break;
    case "Space":
      if (mouseData.heldNodeId) {
        console.log(nodes[mouseData.heldNodeId]);
      }
      break;
    case "Equal":
    case "Minus":
      if (e.ctrlKey) {
        e.preventDefault();
        updateZoom(
          Constants.KEYBOARD_ZOOM_AMOUNT * (e.code === "Equal" ? 1 : -1),
          windowSize().divideBy(2),
        );
      }
      break;
  }
  heldKeys.add(e.code);
};

export const onKeyUp = (e: KeyboardEvent) => {
  heldKeys.delete(e.code);
};

export const onTouchStart = (e: TouchEvent) => {
  e.stopPropagation();
  const touch = e.touches[0];
  const mousePosition = new Vec2(touch.clientX, touch.clientY);
  if (e.touches.length === 2) {
    setMouseData({
      draggingNode: false,
      heldNodeId: undefined,
      mousePosition,
    });
    const { pageX: touch1X, pageY: touch1Y } = e.touches[0];
    const { pageX: touch2X, pageY: touch2Y } = e.touches[1];
    setDrawflow(
      "pinchDistance",
      Math.hypot(touch1X - touch2X, touch1Y - touch2Y),
    );
    return;
  }
  if (e.touches.length === 1) {
    heldKeys.clear();
  }
  setMouseData({
    draggingNode: e.touches.length === 1,
    heldNodeId: undefined,
    mousePosition,
    startPosition: mousePosition
      .divideBy(drawflow.zoomLevel)
      .subtract(drawflow.position),
  });
};

export const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length == 2) {
    const { pageX: touch1X, pageY: touch1Y } = e.touches[0];
    const { pageX: touch2X, pageY: touch2Y } = e.touches[1];
    const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
    const centerPosition = new Vec2(
      (touch1X + touch2X) / 2,
      (touch1Y + touch2Y) / 2,
    );
    updateZoom(currDist - drawflow.pinchDistance, centerPosition);
    setDrawflow("pinchDistance", currDist);
    return;
  }
  setMouseData("mousePosition", (mousePosition) => {
    const newMousePos = new Vec2(e.touches[0].clientX, e.touches[0].clientY);
    updateBackgroundPosition(newMousePos.subtract(mousePosition));
    return newMousePos;
  });
};

// TODO: Refactor this to follow the same pattern as node-functions.ts
export const DrawflowFunctions = {
  onMouseMove,
  onPointerUp,
  onWheel,
  onMouseDown,
  onKeyDown,
  onKeyUp,
  onTouchStart,
  onTouchMove,
} as const;
export type DrawflowFunctions = typeof DrawflowFunctions;

export const SetDrawflowFunction = <T extends keyof DrawflowFunctions>(
  name: T,
  func: DrawflowFunctions[T],
) => {
  DrawflowFunctions[name] = func;
};
