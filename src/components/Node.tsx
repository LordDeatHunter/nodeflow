import { type Component, createEffect, For, JSX } from "solid-js";
import { NodeCss } from "../types/types";
import {
  drawflow,
  mouseData,
  nodes,
  setNodes,
} from "../utils/drawflow-storage";
import {
  inputFunctions,
  nodeFunctions,
  outputFunctions,
} from "../utils/node-functions";
import { defaultPosition } from "../utils/math-utils";

interface NodeProps {
  children?: JSX.Element;
  css: NodeCss;
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
        left: `${nodes[props.nodeId].position.x}px`,
        top: `${nodes[props.nodeId].position.y}px`,
      }}
      classList={{
        [props?.css?.normal ?? ""]: true,
        [props?.css?.selected ?? ""]: mouseData.heldNodeId === props.nodeId,
      }}
      onMouseDown={(e) => nodeFunctions.onMouseDown(e, props.nodeId)}
      onTouchStart={(e) => nodeFunctions.onTouchStart(e, props.nodeId)}
    >
      {props.children}
      <div class={props.css?.inputsSection}>
        <For each={Object.entries(nodes[props.nodeId].inputs)}>
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
                inputFunctions.onPointerUp(e, props.nodeId, inputId)
              }
            />
          )}
        </For>
      </div>
      <div class={props.css?.outputsSection}>
        <For each={Object.entries(nodes[props.nodeId].outputs)}>
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
                outputFunctions.onMouseDown(e, props.nodeId, outputId)
              }
              onTouchStart={(e) =>
                outputFunctions.onTouchStart(e, props.nodeId, outputId)
              }
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default Node;
