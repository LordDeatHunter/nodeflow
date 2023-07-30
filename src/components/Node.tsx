import { For, Show, createEffect, createMemo, type Component } from "solid-js";
import { Position } from "../types/types";
import { nodes } from "../utils/NodeStorage";
import Curve from "./Curve";
import {
  drawflowPos,
  heldNode,
  mousePos,
  setHeldNode,
  zoomLevel,
} from "./Drawflow";

interface NodeProps {
  nodeId: string;
}

const Node: Component<NodeProps> = (props) => {
  const { nodeId } = props;

  const currentNodeSelected = createMemo<boolean>(
    () => heldNode()?.nodeId === nodeId,
    false
  );

  createEffect(() => {
    if (!currentNodeSelected()) return;
    const { x: mouseX, y: mouseY } = mousePos();
    const { x: currentX, y: currentY } = heldNode()?.position ?? {
      x: 0,
      y: 0,
    };
    const pos = {
      x: mouseX / zoomLevel() - currentX,
      y: mouseY / zoomLevel() - currentY,
    };
    nodes()[nodeId].position.set(pos);
  });

  const calculatedPosition = createMemo<Position>(() => {
    const { x, y } = nodes()[nodeId].position.get();
    return {
      x: x + drawflowPos().x,
      y: y + drawflowPos().y,
    };
  });

  return (
    <>
      <div
        ref={nodes()[nodeId].ref.set}
        onMouseDown={(event) => {
          event.stopPropagation();
          const { x, y } = nodes()[nodeId].position.get();
          setHeldNode({
            nodeId,
            position: {
              x: event.clientX / zoomLevel() - x,
              y: event.clientY / zoomLevel() - y,
            },
          });
        }}
        style={{
          "z-index": 2,
          width: "100px",
          height: "100px",
          "background-color": currentNodeSelected() ? "red" : "blue",
          left: `${calculatedPosition().x}px`,
          top: `${calculatedPosition().y}px`,
          position: "absolute",
          "user-select": "none",
        }}
      >
        <h1>{nodeId}</h1>
        <div
          style={{
            position: "absolute",
            display: "flex",
            "justify-content": "space-evenly",
            width: "100%",
            top: "-4px",
          }}
        >
          <For each={Object.entries(nodes()[nodeId].inputs.get())}>
            {([, inputSignal]) => {
              const input = inputSignal.get();
              return (
                <div
                  ref={input.ref.set}
                  style={{
                    "z-index": 1,
                    width: "10px",
                    height: "10px",
                    "background-color": "black",
                    position: "relative",
                    top: `${input.position.get().y}px`,
                    left: `${input.position.get().x}px`,
                  }}
                />
              );
            }}
          </For>
        </div>
        <div
          style={{
            position: "absolute",
            display: "flex",
            "justify-content": "space-evenly",
            width: "100%",
            bottom: "-4px",
          }}
        >
          <For each={Object.entries(nodes()[nodeId].outputs.get())}>
            {([, outputSignal]) => {
              const output = outputSignal.get();
              return (
                <div
                  ref={output.ref.set}
                  style={{
                    "z-index": 1,
                    width: "10px",
                    height: "10px",
                    "background-color": "black",
                    position: "relative",
                    top: `${output.position.get().y}px`,
                    left: `${output.position.get().x}px`,
                  }}
                />
              );
            }}
          </For>
        </div>
      </div>
      <For each={Object.entries(nodes()[nodeId].outputs.get())}>
        {([outputId, outputSignal]) => {
          const output = outputSignal.get();
          return (
            <Show
              when={!!output?.destinationNodeId && !!output?.destinationInputId}
            >
              <Curve
                nodeId={nodeId}
                outputId={outputId}
                destinationNodeId={output.destinationNodeId!}
                destinationInputId={output.destinationInputId!}
              />
            </Show>
          );
        }}
      </For>
    </>
  );
};

export default Node;
