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
import {
  convertSizeToPosition,
  dividePosition,
  subtractPositions,
} from "./math-utils";
import { windowSize } from "./screen-utils";

export const onMouseMove = (e: MouseEvent) => {
  setMouseData("mousePosition", { x: e.clientX, y: e.clientY });
  updateBackgroundPosition({ x: e.movementX, y: e.movementY });
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
  updateZoom(-e.deltaY, { x: e.clientX, y: e.clientY });
};

export const onMouseDown = (e: MouseEvent) => {
  e.stopPropagation();
  resetMovement();
  setMouseData({
    draggingNode: true,
    heldNodeId: undefined,
    mousePosition: { x: e.clientX, y: e.clientY },
    startPosition: {
      x: e.clientX / drawflow.zoomLevel - drawflow.position.x,
      y: e.clientY / drawflow.zoomLevel - drawflow.position.y,
    },
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
          { ...dividePosition(convertSizeToPosition(windowSize()), 2) },
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
  const mousePosition = { x: touch.clientX, y: touch.clientY };
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
    startPosition: subtractPositions(
      dividePosition(mousePosition, drawflow.zoomLevel),
      drawflow.position,
    ),
  });
};

export const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length == 2) {
    const { pageX: touch1X, pageY: touch1Y } = e.touches[0];
    const { pageX: touch2X, pageY: touch2Y } = e.touches[1];
    const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
    const centerPosition = {
      x: (touch1X + touch2X) / 2,
      y: (touch1Y + touch2Y) / 2,
    };
    updateZoom(currDist - drawflow.pinchDistance, centerPosition);
    setDrawflow("pinchDistance", currDist);
    return;
  }
  setMouseData("mousePosition", (mousePosition) => {
    const newMousePos = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    updateBackgroundPosition(subtractPositions(newMousePos, mousePosition));
    return newMousePos;
  });
};

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
