import { Component, createMemo, For, Show } from "solid-js";
import { NodeflowData, NodeflowCss, Vec2 } from "@nodeflow/core";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import SelectionBox from "./SelectionBox";
import { createTick } from "../tick";

interface NodeflowProps {
  css?: NodeflowCss;
  height: string;
  width: string;
}

const NodeflowCanvas =
  (nodeflowData: NodeflowData): Component<NodeflowProps> =>
  (props) => {
    const tick = createTick();

    const nodeIds = createMemo(() => {
      tick();
      return Array.from(nodeflowData.nodes.keys());
    });

    const nodeEntries = createMemo(() => {
      tick();
      return Array.from(nodeflowData.nodes.entries());
    });

    const transform = createMemo(() => {
      tick();
      return `scale(${nodeflowData.zoomLevel}) translate(${nodeflowData.position.x}px, ${nodeflowData.position.y}px)`;
    });

    const hasHeldConnector = createMemo(() => {
      tick();
      return nodeflowData.mouseData.heldConnectors.length === 1;
    });

    const heldConnector = createMemo(() => {
      tick();
      return nodeflowData.mouseData.heldConnectors.at(0);
    });

    const selectionBoxBounds = createMemo(() => {
      tick();
      return nodeflowData.mouseData.selectionBox.boundingBox;
    });

    return (
      <div
        ref={(el) => {
          const resizeObserver = new ResizeObserver(() => {
            nodeflowData.updateCanvasSize(
              Vec2.of(el.clientWidth, el.clientHeight),
            );
            nodeflowData.update({
              startPosition: Vec2.of(el.offsetLeft, el.offsetTop),
            });
          });
          resizeObserver.observe(el);
        }}
        id={`nodeflow-${nodeflowData.id}`}
        tabIndex="0"
        class={props?.css?.nodeflow}
        style={{
          height: props.height,
          width: props.width,
          overflow: "hidden",
        }}
        onMouseMove={(event) =>
          nodeflowData.eventStore.onMouseMoveInNodeflow.publish({ event })
        }
        onPointerUp={(event) =>
          nodeflowData.eventStore.onPointerUpInNodeflow.publish({ event })
        }
        onWheel={(event) =>
          nodeflowData.eventStore.onWheelInNodeflow.publish({ event })
        }
        onMouseDown={(event) =>
          nodeflowData.eventStore.onMouseDownInNodeflow.publish({ event })
        }
        onKeyDown={(event) =>
          nodeflowData.eventStore.onKeyDownInNodeflow.publish({ event })
        }
        onKeyUp={(event) =>
          nodeflowData.eventStore.onKeyUpInNodeflow.publish({ event })
        }
        onTouchStart={(event) =>
          nodeflowData.eventStore.onTouchStartInNodeflow.publish({ event })
        }
        onTouchMove={(event) =>
          nodeflowData.eventStore.onTouchMoveInNodeflow.publish({ event })
        }
      >
        <div
          style={{
            position: "absolute",
            transform: transform(),
            "transform-origin": "center",
            transition: "scale 0.1s ease-out",
          }}
        >
          <For each={nodeIds()}>
            {(nodeId) => (
              <NodeflowNode
                nodeId={nodeId}
                nodeflowData={nodeflowData}
                tick={tick}
              />
            )}
          </For>
          <svg
            style={{
              "z-index": 2,
              position: "absolute",
              width: "1px",
              height: "1px",
              "pointer-events": "none",
              overflow: "visible",
            }}
          >
            <For each={nodeEntries()}>
              {([nodeId, node]) => (
                <For each={node.getAllConnectors()}>
                  {(connector) => (
                    <For each={connector.destinations.array}>
                      {(outputConnection) => (
                        <NodeCurve
                          nodeflowData={nodeflowData}
                          sourceNodeId={nodeId}
                          sourceConnectorId={connector.id}
                          destinationNodeId={
                            outputConnection.destinationConnector.parentSection
                              .parentNode.id
                          }
                          destinationConnectorId={
                            outputConnection.destinationConnector.id
                          }
                          css={outputConnection.css}
                          tick={tick}
                        />
                      )}
                    </For>
                  )}
                </For>
              )}
            </For>
          </svg>
          <Show when={hasHeldConnector()}>
            <Curve
              css={props?.css?.getNewCurveCss?.(heldConnector())}
              nodeflowData={nodeflowData}
              tick={tick}
            />
          </Show>
        </div>
        <Show when={selectionBoxBounds()}>
          <SelectionBox nodeflowData={nodeflowData} tick={tick} />
        </Show>
      </div>
    );
  };

export default NodeflowCanvas;
