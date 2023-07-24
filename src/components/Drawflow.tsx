import { Component, For, createSignal } from "solid-js";
import { HeldNode } from "../types/types";
import { nodes } from "../utils/NodeStorage";
import Node from "./Node";

interface DrawflowProps {}

export const [heldNode, setHeldNode] = createSignal<HeldNode | null>(null);
export const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

const Drawflow: Component<DrawflowProps> = (props) => {
  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseUp={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        setHeldNode(null);
      }}
    >
      <For each={Object.keys(nodes())}>
        {(nodeId) => <Node nodeId={nodeId} />}
      </For>
    </div>
  );
};

export default Drawflow;
