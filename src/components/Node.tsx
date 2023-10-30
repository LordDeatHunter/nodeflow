import { type Component, createEffect, createMemo, For } from "solid-js";
import {
  drawflow,
  mouseData,
  nodes,
  setNodes,
} from "../utils/drawflow-storage";
import {
  InputFunctions,
  NodeFunctions,
  OutputFunctions,
} from "../utils/node-functions";
import { defaultPosition } from "../utils/math-utils";

interface NodeProps {
  nodeId: string;
}

const Node: Component<NodeProps> = (props) => {
  createEffect(() => {
    if (mouseData.heldNodeId !== props.nodeId || !mouseData.draggingNode)
      return;
    const { x: mouseX, y: mouseY } = mouseData.mousePosition;
    const { x: startX, y: startY } =
      mouseData.startPosition ?? defaultPosition();
    const pos = {
      x: mouseX / drawflow.zoomLevel - startX,
      y: mouseY / drawflow.zoomLevel - startY,
    };

    setNodes(props.nodeId, "position", pos);
  });

  const node = createMemo(() => nodes[props.nodeId]);

  return (
    <div
      ref={(el) =>
        setTimeout(() => {
          if (!el) return;
          setNodes(props.nodeId, {
            offset: {
              x: el.clientLeft,
              y: el.clientTop,
            },
            ref: el,
          });
        })
      }
      style={{
        left: `${node().position.x}px`,
        top: `${node().position.y}px`,
      }}
      classList={{
        [node()?.css?.normal ?? ""]: true,
        [node()?.css?.selected ?? ""]: mouseData.heldNodeId === props.nodeId,
      }}
      onMouseDown={(e) => NodeFunctions.onMouseDown(e, props.nodeId)}
      onTouchStart={(e) => NodeFunctions.onTouchStart(e, props.nodeId)}
    >
      {node().display(props.nodeId)}
      <div class={node()?.css?.inputsSection}>
        <For each={Object.entries(node().inputs)}>
          {([inputId, input]) => (
            <div
              ref={(el) =>
                setTimeout(() => {
                  if (!el) return;
                  setNodes(props.nodeId, "inputs", inputId, (prev) => ({
                    ...prev,
                    position: {
                      x: (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
                      y: (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
                    },
                    ref: el,
                    size: {
                      width: el.offsetWidth,
                      height: el.offsetHeight,
                    },
                  }));
                })
              }
              class={input?.css}
              onPointerUp={(e) =>
                InputFunctions.onPointerUp(e, props.nodeId, inputId)
              }
            />
          )}
        </For>
      </div>
      <div class={node()?.css?.outputsSection}>
        <For each={Object.entries(node().outputs)}>
          {([outputId, output]) => (
            <div
              ref={(el) => {
                setTimeout(() => {
                  if (!el) return;
                  setNodes(props.nodeId, "outputs", outputId, (prev) => ({
                    ...prev,
                    position: {
                      x: (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
                      y: (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
                    },
                    ref: el,
                    size: {
                      width: el.offsetWidth,
                      height: el.offsetHeight,
                    },
                  }));
                });
              }}
              class={output?.css}
              onMouseDown={(e) =>
                OutputFunctions.onMouseDown(e, props.nodeId, outputId)
              }
              onTouchStart={(e) =>
                OutputFunctions.onTouchStart(e, props.nodeId, outputId)
              }
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default Node;
