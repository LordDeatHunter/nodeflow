import { type Component, createEffect, createMemo, For } from "solid-js";
import {
  ConnectorFunctions,
  defaultPosition,
  drawflow,
  mouseData,
  NodeFunctions,
  nodes,
  setNodes,
} from "../utils";

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
      <For each={Object.entries(node().connectorSections)}>
        {([sectionId, section]) => (
          <div class={section?.css}>
            <For each={Object.entries(section.connectors)}>
              {([connectorID, connector]) => (
                <div
                  ref={(el) =>
                    setTimeout(() => {
                      if (!el) return;
                      setNodes(
                        props.nodeId,
                        "connectorSections",
                        sectionId,
                        "connectors",
                        connectorID,
                        (prev) => ({
                          ...prev,
                          position: {
                            x:
                              (el?.parentElement?.offsetLeft ?? 0) +
                              el.offsetLeft,
                            y:
                              (el?.parentElement?.offsetTop ?? 0) +
                              el.offsetTop,
                          },
                          ref: el,
                          size: {
                            width: el.offsetWidth,
                            height: el.offsetHeight,
                          },
                        }),
                      );
                    })
                  }
                  class={connector?.css}
                  onPointerUp={(e) =>
                    // TODO: old input
                    ConnectorFunctions.onPointerUp(e, props.nodeId, connectorID)
                  }
                  onMouseDown={(e) =>
                    // TODO: old output
                    ConnectorFunctions.onMouseDown(e, props.nodeId, connectorID)
                  }
                  onTouchStart={(e) =>
                    // TODO: old output
                    ConnectorFunctions.onTouchStart(
                      e,
                      props.nodeId,
                      connectorID,
                    )
                  }
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

export default Node;
