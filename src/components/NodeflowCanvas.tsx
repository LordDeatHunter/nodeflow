import { Component, For, Show } from "solid-js";
import { NodeflowData } from "../utils";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import { NodeflowCss } from "../nodeflow-types";
import Vec2 from "../utils/data/Vec2";

interface NodeflowProps {
  css?: NodeflowCss;
  height: string;
  width: string;
}

const NodeflowCanvas =
  (nodeflowData: NodeflowData): Component<NodeflowProps> =>
  (props) => (
    <div
      ref={(el) => {
        const resizeObserver = new ResizeObserver(() => {
          nodeflowData.update({
            size: Vec2.of(el.clientWidth, el.clientHeight),
            startPosition: Vec2.of(el.offsetLeft, el.offsetTop),
          });
        });
        resizeObserver.observe(el);
      }}
      tabIndex="0"
      class={props?.css?.nodeflow}
      style={{
        height: props.height,
        width: props.width,
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
          transform: `scale(${nodeflowData.zoomLevel}) translate(${nodeflowData.position.x}px, ${nodeflowData.position.y}px)`,
          "transform-origin": "center",
          transition: "scale 0.1s ease-out",
        }}
      >
        <For each={Array.from(nodeflowData.nodes.keys())}>
          {(nodeId) => (
            <NodeflowNode nodeId={nodeId} nodeflowData={nodeflowData} />
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
          <For each={Array.from(nodeflowData.nodes.entries())}>
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
                      />
                    )}
                  </For>
                )}
              </For>
            )}
          </For>
        </svg>
        <Show
          when={
            nodeflowData.mouseData.heldNodeId &&
            nodeflowData.mouseData.heldConnectorId
          }
        >
          <Curve css={props?.css?.newCurve} nodeflowData={nodeflowData} />
        </Show>
      </div>
    </div>
  );

export default NodeflowCanvas;
