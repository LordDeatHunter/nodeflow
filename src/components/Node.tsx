import { For, Show, createEffect, createMemo, type Component } from "solid-js";
import { nodes } from "../utils/NodeStorage";
import Curve from "./Curve";
import { heldNode, mousePos, setHeldNode } from "./Drawflow";

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
      x: mouseX - currentX,
      y: mouseY - currentY,
    };
    nodes()[nodeId].position.set(pos);
  });

  return (
    <>
      <div
        ref={nodes()[nodeId].ref.set}
        onMouseDown={(event) => {
          const { x, y } = nodes()[nodeId].position.get();
          setHeldNode({
            nodeId,
            position: {
              x: event.clientX - x,
              y: event.clientY - y,
            },
          });
        }}
        style={{
          "z-index": 2,
          width: "100px",
          height: "100px",
          "background-color": currentNodeSelected() ? "red" : "blue",
          left: `${nodes()[nodeId].position.get().x}px`,
          top: `${nodes()[nodeId].position.get().y}px`,
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
            {([_, inputSignal]) => {
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
            {([outputId, outputSignal]) => {
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
