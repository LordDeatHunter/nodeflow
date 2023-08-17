import { Component, For, createSignal } from "solid-js";
import { HeldNode, Position } from "../types/types";
import { nodes } from "../utils/NodeStorage";
import {
  clamp,
  convertSizeToPosition,
  dividePosition,
  multiplyPosition,
  subtractPositions,
} from "../utils/math-utils";
import { getScreenSize } from "../utils/screen-utils";
import Node from "./Node";

export const [heldNode, setHeldNode] = createSignal<HeldNode | null>(null);
export const [mousePos, setMousePos] = createSignal<Position>({ x: 0, y: 0 });
export const [drawflowPos, setDrawflowPos] = createSignal<Position>({
  x: 0,
  y: 0,
});
export const [zoomLevel, setZoomLevel] = createSignal<number>(1);

export const MAX_ZOOM = 200;
export const MIN_ZOOM = 0.02;
export const ZOOM_MULTIPLIER = 0.005;

const Drawflow: Component = () => {
  const [dist, setDist] = createSignal(0);

  const updateZoom = (distance: number, zoomLocation: Position): void => {
    const oldZoom = zoomLevel();
    const newZoom = clamp(
      oldZoom + oldZoom * distance * ZOOM_MULTIPLIER,
      MIN_ZOOM,
      MAX_ZOOM
    );
    if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) return;
    setHeldNode(null);
    setZoomLevel(newZoom);
    const windowDimensions = convertSizeToPosition(getScreenSize());
    const oldScreenSize = multiplyPosition(windowDimensions, oldZoom);
    const newScreenSize = multiplyPosition(windowDimensions, newZoom);
    const oldOffset = dividePosition(
      subtractPositions(zoomLocation, dividePosition(oldScreenSize, 2)),
      oldZoom
    );
    const newOffset = dividePosition(
      subtractPositions(zoomLocation, dividePosition(newScreenSize, 2)),
      newZoom
    );
    setDrawflowPos((prev) => ({
      x: prev.x - oldOffset.x + newOffset.x,
      y: prev.y - oldOffset.y + newOffset.y,
    }));
    return;
  };

  const updateBackgroundPosition = (moveDistance: Position) => {
    if (heldNode()?.nodeId || !heldNode()?.position) return;
    setDrawflowPos((prev) => ({
      x: prev.x + moveDistance.x / zoomLevel(),
      y: prev.y + moveDistance.y / zoomLevel(),
    }));
  };

  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        transform: `scale(${zoomLevel()})`,
        "transform-origin": "top left",
        width: `${window.innerWidth / zoomLevel()}px`,
        height: `${window.innerHeight / zoomLevel()}px`,
      }}
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        updateBackgroundPosition({ x: e.movementX, y: e.movementY });
      }}
      onPointerUp={() => {
        setHeldNode(null);
      }}
      onWheel={(e) => {
        e.preventDefault();
        updateZoom(-e.deltaY, { x: e.clientX, y: e.clientY });
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        setMousePos({ x: event.clientX, y: event.clientY });
        setHeldNode({
          position: {
            x: event.clientX / zoomLevel() - drawflowPos().x,
            y: event.clientY / zoomLevel() - drawflowPos().y,
          },
        });
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
        const touch = event.touches[0];
        setMousePos({ x: touch.clientX, y: touch.clientY });
        if (event.touches.length == 2) {
          setHeldNode(null);
          const { pageX: touch1X, pageY: touch1Y } = event.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = event.touches[1];
          setDist(Math.hypot(touch1X - touch2X, touch1Y - touch2Y));
          return;
        }
        setHeldNode({
          position: {
            x: touch.clientX / zoomLevel() - drawflowPos().x,
            y: touch.clientY / zoomLevel() - drawflowPos().y,
          },
        });
      }}
      onTouchMove={(e) => {
        if (e.touches.length == 2) {
          const { pageX: touch1X, pageY: touch1Y } = e.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = e.touches[1];
          const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
          const centerPosition = {
            x: (touch1X + touch2X) / 2,
            y: (touch1Y + touch2Y) / 2,
          };
          updateZoom(currDist - dist(), centerPosition);
          setDist(currDist);
          return;
        }
        const prevPos = mousePos();
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        updateBackgroundPosition(subtractPositions(mousePos(), prevPos));
      }}
    >
      <For each={Object.entries(nodes())}>
        {([nodeId, nodeData]) => (
          <Node css={nodeData.css.get} nodeId={nodeId}>
            <h1>ID: {nodeId}</h1>
          </Node>
        )}
      </For>
    </div>
  );
};

export default Drawflow;
