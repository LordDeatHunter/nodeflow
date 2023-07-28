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

const Drawflow: Component = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        if (heldNode()?.nodeId || !heldNode()?.position) return;
        setDrawflowPos((prev) => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY,
        }));
      }}
      onMouseUp={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        setHeldNode(null);
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        setHeldNode({
          position: {
            x: event.clientX - drawflowPos().x,
            y: event.clientY - drawflowPos().y,
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
