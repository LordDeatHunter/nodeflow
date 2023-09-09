import { type Component, createEffect, For, JSX } from "solid-js";
import { NodeCss, Position } from "../types/types";
import {
  drawflow,
  mouseData,
  nodes,
  setMouseData,
  setNodes,
} from "../utils/drawflow-storage";

interface NodeProps {
  children?: JSX.Element;
  css: NodeCss;
  nodeId: string;
}

const Node: Component<NodeProps> = (props) => {
  createEffect(() => {
    if (mouseData.heldNodeId !== props.nodeId || !mouseData.dragging) return;
    const { x: mouseX, y: mouseY } = mouseData.mousePosition;
    const { x: startX, y: startY } = mouseData.startPosition ?? {
      x: 0,
      y: 0,
    };
    const pos = {
      x: mouseX / drawflow.zoomLevel - startX,
      y: mouseY / drawflow.zoomLevel - startY,
    };

    setNodes(props.nodeId, "position", pos);
  });

  const selectNode = (position: Position) => {
    const { x, y } = nodes[props.nodeId]!.position;
    setMouseData({
      dragging: true,
      heldNodeId: props.nodeId,
      mousePosition: position,
      startPosition: {
        x: position.x / drawflow.zoomLevel - x,
        y: position.y / drawflow.zoomLevel - y,
      },
    });
  };

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
        left: `${nodes[props.nodeId].position.x}px`,
        top: `${nodes[props.nodeId].position.y}px`,
      }}
      classList={{
        [props?.css?.normal ?? ""]: true,
        [props?.css?.selected ?? ""]: mouseData.heldNodeId === props.nodeId,
      }}
    >
      {props.children}
      <div class={props.css?.inputsSection}>
        <For each={Object.entries(nodes[props.nodeId].inputs)}>
          {([inputId]) => (
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
              class={props.css?.inputConnector}
            />
          )}
        </For>
      </div>
      <div class={props.css?.outputsSection}>
        <For each={Object.entries(nodes[props.nodeId].outputs)}>
          {([outputId]) => (
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
              class={props.css?.outputConnector}
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default Node;
