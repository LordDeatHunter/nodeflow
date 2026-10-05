import { describe, it, expect, beforeEach } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import Rect from "../src/Rect";
import { KEYBOARD_KEY_CODES, MOUSE_BUTTONS } from "../src/constants";
import { SelectableElementType } from "../src/nodeflow-types";

const mouseEvent = (
  clientX: number,
  clientY: number,
  button: MOUSE_BUTTONS = MOUSE_BUTTONS.LEFT,
): MouseEvent =>
  ({
    button,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    movementX: 0,
    movementY: 0,
    preventDefault: () => {},
    stopPropagation: () => {},
  }) as unknown as MouseEvent;

describe("mouse selection box with modifiers", () => {
  let canvas: NodeflowData;

  const addNode = (id: string, x: number, y: number) =>
    canvas.addNode(
      { id, position: { x, y }, size: { x: 50, y: 50 } },
      false,
    );

  const regionOverFar = () => Rect.of(Vec2.of(900, 900), Vec2.of(300, 300));

  beforeEach(() => {
    canvas = new NodeflowData("selection-canvas");
  });

  it("keeps previously selected nodes when ctrl+shift+dragging a region", () => {
    const near = addNode("near", 10, 10);
    addNode("far", 1000, 1000);

    canvas.mouseData.selections.add({
      type: SelectableElementType.Node,
      node: near,
    });
    canvas.keyboardData.pressKey(KEYBOARD_KEY_CODES.CONTROL_LEFT);
    canvas.keyboardData.pressKey(KEYBOARD_KEY_CODES.SHIFT_LEFT);

    canvas.eventStore.onMouseDownInNodeflow.publish({
      event: mouseEvent(0, 0),
    });
    canvas.mouseData.selectionBox.boundingBox = regionOverFar();
    canvas.eventStore.onPointerUpInNodeflow.publish({
      event: mouseEvent(1000, 1000),
    });

    expect(canvas.mouseData.hasSelectedNode("near")).toBe(true);
    expect(canvas.mouseData.hasSelectedNode("far")).toBe(true);
  });

  it("replaces the selection for a plain shift+drag region", () => {
    const near = addNode("near", 10, 10);
    addNode("far", 1000, 1000);

    canvas.mouseData.selections.add({
      type: SelectableElementType.Node,
      node: near,
    });
    canvas.keyboardData.pressKey(KEYBOARD_KEY_CODES.SHIFT_LEFT);

    canvas.eventStore.onMouseDownInNodeflow.publish({
      event: mouseEvent(0, 0),
    });
    canvas.mouseData.selectionBox.boundingBox = regionOverFar();
    canvas.eventStore.onPointerUpInNodeflow.publish({
      event: mouseEvent(1000, 1000),
    });

    expect(canvas.mouseData.hasSelectedNode("near")).toBe(false);
    expect(canvas.mouseData.hasSelectedNode("far")).toBe(true);
  });
});
