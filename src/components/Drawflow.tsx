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
const MAX_ZOOM = 200;
const MIN_ZOOM = 0.02;
const ZOOM_MULTIPLIER = 0.002;

const Drawflow: Component = () => {
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
        if (heldNode()?.nodeId || !heldNode()?.position) return;
        setDrawflowPos((prev) => ({
          x: prev.x + e.movementX / zoomLevel(),
          y: prev.y + e.movementY / zoomLevel(),
        }));
      }}
      onMouseUp={() => {
        setHeldNode(null);
      }}
      onWheel={(e) => {
        e.preventDefault();
        const oldZoom = zoomLevel();
        const newZoom = clamp(
          oldZoom + oldZoom * e.deltaY * -ZOOM_MULTIPLIER,
          MIN_ZOOM,
          MAX_ZOOM
        );
        if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) return;
        setZoomLevel(newZoom);
        const mousePos = { x: e.clientX, y: e.clientY };
        const windowDimensions = convertSizeToPosition(getScreenSize());
        const oldScreenSize = multiplyPosition(windowDimensions, oldZoom);
        const newScreenSize = multiplyPosition(windowDimensions, newZoom);
        const oldOffset = dividePosition(
          subtractPositions(mousePos, dividePosition(oldScreenSize, 2)),
          oldZoom
        );
        const newOffset = dividePosition(
          subtractPositions(mousePos, dividePosition(newScreenSize, 2)),
          newZoom
        );
        setDrawflowPos((prev) => ({
          x: prev.x - oldOffset.x + newOffset.x,
          y: prev.y - oldOffset.y + newOffset.y,
        }));
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        setHeldNode({
          position: {
            x: event.clientX / zoomLevel() - drawflowPos().x,
            y: event.clientY / zoomLevel() - drawflowPos().y,
          },
        });
      }}
    >
      <For each={Object.keys(nodes())}>
        {(nodeId) => <Node nodeId={nodeId} />}
      </For>
    </div>
  );
};

export default Drawflow;
