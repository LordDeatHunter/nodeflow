import { For, Show, createEffect, createMemo, type Component } from "solid-js";
import { Position } from "../types/types";
import { getNode } from "../utils/NodeStorage";
import Curve from "./Curve";
import {
  drawflowPos,
  heldNode,
  mousePos,
  setHeldNode,
  setMousePos,
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
    getNode(nodeId)!.position.set(pos);
  });

  const calculatedPosition = createMemo<Position>(() => {
    const { x, y } = getNode(nodeId)!.position.get();
    return {
      x: x + drawflowPos().x,
      y: y + drawflowPos().y,
    };
  });

  const selectNode = (position: Position) => {
    setMousePos(position);
    const { x, y } = getNode(nodeId)!.position.get();
    setHeldNode({
      nodeId,
      position: {
        x: position.x / zoomLevel() - x,
        y: position.y / zoomLevel() - y,
      },
    });
  };

  return (
    <>
      <div
        ref={getNode(nodeId)!.ref.set}
        onMouseDown={(event) => {
          event.stopPropagation();
          selectNode({ x: event.clientX, y: event.clientY });
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
          const touch = event.touches[0];
          selectNode({ x: touch.clientX, y: touch.clientY });
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
          <For each={Object.entries(getNode(nodeId)!.inputs.get())}>
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
          <For each={Object.entries(getNode(nodeId)!.outputs.get())}>
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
      <For each={Object.entries(getNode(nodeId)!.outputs.get())}>
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
