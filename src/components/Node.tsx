import { type Component, createEffect, For } from "solid-js";
import { NodeCss, Position } from "../types/types";
import { mouseData, nodes, setMouseData, setNodes } from "../utils/NodeStorage";
import { zoomLevel } from "./Drawflow";

interface NodeProps {
  nodeId: string;
  children?: any;
  css: NodeCss;
}

const Node: Component<NodeProps> = (props) => {
  const { nodeId, children } = props;

  createEffect(() => {
    if (mouseData.heldNodeId !== nodeId || !mouseData.dragging) return;
    const { x: mouseX, y: mouseY } = mouseData.mousePosition;
    const { x: startX, y: startY } = mouseData.startPosition ?? {
      x: 0,
      y: 0,
    };
    const pos = {
      x: mouseX / zoomLevel() - startX,
      y: mouseY / zoomLevel() - startY,
    };

    setNodes(nodeId, "position", pos);
  });

  const selectNode = (position: Position) => {
    const { x, y } = nodes[nodeId]!.position;
    setMouseData({
      dragging: true,
      heldNodeId: nodeId,
      mousePosition: position,
      startPosition: {
        x: position.x / zoomLevel() - x,
        y: position.y / zoomLevel() - y,
      },
    });
  };

  return (
    <div
      ref={(el) =>
        setTimeout(() => {
          if (!el) return;
          setNodes(nodeId, "ref", el);
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
        left: `${nodes[nodeId].position.x}px`,
        top: `${nodes[nodeId].position.y}px`,
      }}
      classList={{
        [props?.css?.normal ?? ""]: true,
        [props?.css?.selected ?? ""]: mouseData.heldNodeId === nodeId,
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          display: "flex",
          "justify-content": "space-evenly",
          width: "100%",
          top: "-6px",
        }}
      >
        <For each={Object.entries(nodes[nodeId].inputs)}>
          {([inputId]) => (
            <div
              ref={(el) =>
                setTimeout(() => {
                  if (!el) return;
                  setNodes(nodeId, "inputs", inputId, (prev) => ({
                    ...prev,
                    ref: el,
                    position: {
                      x: (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
                      y: (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
                    },
                    size: {
                      width: el.offsetWidth,
                      height: el.offsetHeight,
                    },
                  }));
                })
              }
              style={{
                "z-index": 1,
                width: "10px",
                height: "10px",
                "background-color": "black",
                position: "relative",
                "border-radius": "50%",
              }}
            />
          )}
        </For>
      </div>
      <div
        style={{
          position: "absolute",
          display: "flex",
          "justify-content": "space-evenly",
          width: "100%",
          bottom: "-6px",
        }}
      >
        <For each={Object.entries(nodes[nodeId].outputs)}>
          {([outputId]) => (
            <div
              style={{
                "z-index": 1,
                width: "10px",
                height: "10px",
                "background-color": "black",
                position: "relative",
                "border-radius": "50%",
              }}
              ref={(el) => {
                setTimeout(() => {
                  if (!el) return;
                  setNodes(nodeId, "outputs", outputId, (prev) => ({
                    ...prev,
                    ref: el,
                    position: {
                      x: (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
                      y: (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
                    },
                    size: {
                      width: el.offsetWidth,
                      height: el.offsetHeight,
                    },
                  }));
                });
              }}
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default Node;
