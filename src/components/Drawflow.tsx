import { Component, For, createSignal } from "solid-js";
import { HeldNode, Position } from "../types/types";
import { nodes } from "../utils/NodeStorage";
import Node from "./Node";

export const [heldNode, setHeldNode] = createSignal<HeldNode | null>(null);
export const [mousePos, setMousePos] = createSignal<Position>({ x: 0, y: 0 });
export const [drawflowPos, setDrawflowPos] = createSignal<Position>({
  x: 0,
  y: 0,
});
export const [zoomLevel, setZoomLevel] = createSignal<number>(1);

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
        const newZoom = oldZoom + e.deltaY * -0.001;
        setZoomLevel((prev) => prev + e.deltaY * -0.001);
        const screenSize = {
          x: window.innerWidth * oldZoom,
          y: window.innerHeight * oldZoom,
        };
        const newScreenSize = {
          x: window.innerWidth * newZoom,
          y: window.innerHeight * newZoom,
        };
        const mousePos = {
          x: e.clientX,
          y: e.clientY,
        };
        const offset = {
          x: mousePos.x - newScreenSize.x / 2,
          y: mousePos.y - newScreenSize.y / 2,
        };
        setDrawflowPos((prev) => ({
          x: prev.x - offset.x / oldZoom + offset.x / zoomLevel(),
          y: prev.y - offset.y / oldZoom + offset.y / zoomLevel(),
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
