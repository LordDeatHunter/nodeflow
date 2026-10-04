import { describe, it, expect, beforeEach, vi } from "vitest";
import NodeflowData from "../src/NodeflowData";
import Vec2 from "../src/Vec2";
import { MOUSE_BUTTONS } from "../src/constants";

interface FakeTouch {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
}

const touch = (clientX: number, clientY: number): FakeTouch => ({
  clientX,
  clientY,
  pageX: clientX,
  pageY: clientY,
});

const touchEvent = (touches: FakeTouch[]): TouchEvent =>
  ({
    touches,
    changedTouches: touches,
    preventDefault: () => {},
    stopPropagation: () => {},
  }) as unknown as TouchEvent;

const touchStart = (canvas: NodeflowData, touches: FakeTouch[]) =>
  canvas.eventStore.onTouchStartInNodeflow.publish({
    event: touchEvent(touches),
  });

const touchMove = (canvas: NodeflowData, touches: FakeTouch[]) =>
  canvas.eventStore.onTouchMoveInNodeflow.publish({
    event: touchEvent(touches),
  });

const touchEnd = (canvas: NodeflowData, touches: FakeTouch[]) =>
  canvas.eventStore.onTouchEndInNodeflow.publish({
    event: touchEvent(touches),
  });

function addNodeWithConnector(
  canvas: NodeflowData,
  position = { x: 0, y: 0 },
  nodeId = "n",
  sectionId = "s0",
  connectorId = "c0",
) {
  const node = canvas.addNode(
    {
      id: nodeId,
      position,
      connectorSections: {
        [sectionId]: {
          id: sectionId,
          connectors: {
            [connectorId]: {
              id: connectorId,
              hovered: false,
              position: { x: 0, y: 0 },
            },
          },
        },
      },
    },
    false,
  );
  return { node, nodeId: node.id, sectionId, connectorId };
}

describe("touch gestures", () => {
  let canvas: NodeflowData;

  beforeEach(() => {
    canvas = new NodeflowData("gesture-canvas");
  });

  describe("background gesture start", () => {
    it("selects the nodeflow and arms panning on a single touch", () => {
      touchStart(canvas, [touch(100, 100)]);

      expect(canvas.mouseData.hasSelectedNodeflow()).toBe(true);
      expect(canvas.mouseData.pointerDown).toBe(true);
      expect(canvas.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(true);
      expect(canvas.mouseData.touchStartPosition?.x).toBe(100);
    });

    it("does not arm panning while pinching (two touches)", () => {
      touchStart(canvas, [touch(0, 0), touch(100, 0)]);

      expect(canvas.mouseData.pinching).toBe(true);
      expect(canvas.mouseData.pointerDown).toBe(false);
      expect(canvas.mouseData.hasSelectedNodeflow()).toBe(false);
    });
  });

  describe("one-finger pan", () => {
    it("moves the canvas position after the movement threshold is exceeded", () => {
      touchStart(canvas, [touch(100, 100)]);
      touchMove(canvas, [touch(150, 100)]);

      expect(canvas.position.x).toBeCloseTo(50);
      expect(canvas.position.y).toBeCloseTo(0);
    });

    it("ignores movement below the gesture threshold", () => {
      touchStart(canvas, [touch(100, 100)]);
      touchMove(canvas, [touch(103, 100)]);

      expect(canvas.position.x).toBe(0);
      expect(canvas.position.y).toBe(0);
    });

    it("respects a custom gesture threshold", () => {
      canvas.updateSettings({ gestureMovementThreshold: 50 });
      touchStart(canvas, [touch(100, 100)]);
      touchMove(canvas, [touch(120, 100)]);

      expect(canvas.position.x).toBe(0);
    });
  });

  describe("one-finger node drag", () => {
    it("drags a touched node instead of panning", () => {
      const node = canvas.addNode(
        { id: "n1", position: { x: 0, y: 0 } },
        false,
      );

      canvas.eventStore.onTouchStartInNode.publish({
        nodeId: "n1",
        event: touchEvent([touch(100, 100)]),
      });
      expect(canvas.mouseData.heldNodes).toHaveLength(1);

      touchMove(canvas, [touch(140, 100)]);

      expect(node.position.x).toBeCloseTo(40);
      expect(canvas.position.x).toBe(0);
    });

    it("does not drag nodes when movement is disabled", () => {
      const node = canvas.addNode(
        { id: "n1", position: { x: 0, y: 0 } },
        false,
      );
      canvas.updateSettings({ canMoveNodes: false });

      canvas.eventStore.onTouchStartInNode.publish({
        nodeId: "n1",
        event: touchEvent([touch(100, 100)]),
      });
      touchMove(canvas, [touch(140, 100)]);

      expect(node.position.x).toBe(0);
    });
  });

  describe("pinch zoom", () => {
    it("increases zoom when the fingers spread apart", () => {
      touchStart(canvas, [touch(0, 0), touch(100, 0)]);
      expect(canvas.pinchDistance).toBeCloseTo(100);

      touchMove(canvas, [touch(0, 0), touch(200, 0)]);

      expect(canvas.zoomLevel).toBeGreaterThan(1);
    });

    it("decreases zoom when the fingers pinch together", () => {
      touchStart(canvas, [touch(0, 0), touch(200, 0)]);
      touchMove(canvas, [touch(0, 0), touch(100, 0)]);

      expect(canvas.zoomLevel).toBeLessThan(1);
    });
  });

  describe("touch end and cancel", () => {
    it("clears gesture state when all fingers are lifted", () => {
      touchStart(canvas, [touch(100, 100)]);
      touchEnd(canvas, []);

      expect(canvas.mouseData.pointerDown).toBe(false);
      expect(canvas.mouseData.touchStartPosition).toBeUndefined();
      expect(canvas.mouseData.isHoldingButton(MOUSE_BUTTONS.LEFT)).toBe(false);
    });

    it("re-anchors when a pinch ends with one finger remaining", () => {
      touchStart(canvas, [touch(0, 0), touch(100, 0)]);
      touchEnd(canvas, [touch(50, 50)]);

      expect(canvas.mouseData.pinching).toBe(false);
      expect(canvas.pinchDistance).toBe(0);
      expect(canvas.mouseData.touchStartPosition?.x).toBe(50);
    });

    it("resets selections on touch cancel", () => {
      touchStart(canvas, [touch(100, 100)]);
      expect(canvas.mouseData.hasSelectedNodeflow()).toBe(true);

      canvas.eventStore.onTouchCancelInNodeflow.publish({
        event: touchEvent([]),
      });

      expect(canvas.mouseData.hasSelectedNodeflow()).toBe(false);
    });
  });

  describe("connector creation", () => {
    it("starts creating a connection on connector touch start", () => {
      const { nodeId, connectorId } = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );

      canvas.eventStore.onTouchStartInConnector.publish({
        nodeId,
        connectorId,
        event: touchEvent([touch(10, 10)]),
      });

      expect(canvas.mouseData.heldConnectors).toHaveLength(1);
    });

    it("ignores synthetic touch pointer-up events", () => {
      const src = addNodeWithConnector(
        canvas,
        { x: 0, y: 0 },
        "src",
        "s0",
        "c0",
      );
      const dst = addNodeWithConnector(
        canvas,
        { x: 100, y: 0 },
        "dst",
        "s0",
        "c0",
      );

      canvas.mouseData.startCreatingConnection(
        src.nodeId,
        Vec2.of(0, 0),
        src.connectorId,
      );

      const spy = vi.fn();
      canvas.eventStore.onNodeConnected.subscribe("test:spy", spy);

      canvas.eventStore.onPointerUpInConnector.publish({
        nodeId: dst.nodeId,
        connectorId: dst.connectorId,
        event: {
          pointerType: "touch",
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as PointerEvent,
      });

      expect(spy).not.toHaveBeenCalled();
      expect(canvas.mouseData.heldConnectors).toHaveLength(1);
    });
  });
});
