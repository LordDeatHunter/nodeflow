import { Component, For, Show } from "solid-js";
import { drawflow, drawflowEventStore } from "../utils";
import DrawflowNode from "./DrawflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import { DrawflowCss } from "../drawflow-types";
import Vec2 from "../utils/data/Vec2";

interface DrawflowProps {
  css?: DrawflowCss;
  height: string;
  width: string;
}

const Drawflow: Component<DrawflowProps> = (props) => (
  <div
    ref={(el) => {
      const resizeObserver = new ResizeObserver(() => {
        drawflow.update({
          size: Vec2.of(el.clientWidth, el.clientHeight),
          startPosition: Vec2.of(el.offsetLeft, el.offsetTop),
        });
      });
      resizeObserver.observe(el);
    }}
    tabIndex="0"
    class={props?.css?.drawflow}
    style={{
      height: props.height,
      width: props.width,
    }}
    onMouseMove={(event) =>
      drawflowEventStore.onMouseMoveInDrawflow.publish({ event })
    }
    onPointerUp={(event) =>
      drawflowEventStore.onPointerUpInDrawflow.publish({ event })
    }
    onWheel={(event) => drawflowEventStore.onWheelInDrawflow.publish({ event })}
    onMouseDown={(event) =>
      drawflowEventStore.onMouseDownInDrawflow.publish({ event })
    }
    onKeyDown={(event) =>
      drawflowEventStore.onKeyDownInDrawflow.publish({ event })
    }
    onKeyUp={(event) => drawflowEventStore.onKeyUpInDrawflow.publish({ event })}
    onTouchStart={(event) =>
      drawflowEventStore.onTouchStartInDrawflow.publish({ event })
    }
    onTouchMove={(event) =>
      drawflowEventStore.onTouchMoveInDrawflow.publish({ event })
    }
  >
    <div
      style={{
        position: "absolute",
        transform: `scale(${drawflow.zoomLevel}) translate(${drawflow.position.x}px, ${drawflow.position.y}px)`,
        "transform-origin": "center",
        transition: "scale 0.1s ease-out",
      }}
    >
      <For each={Array.from(drawflow.nodes.keys())}>
        {(nodeId) => <DrawflowNode nodeId={nodeId} />}
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
        <For each={Array.from(drawflow.nodes.entries())}>
          {([nodeId, node]) => (
            <For each={node.getAllConnectors()}>
              {(connector) => (
                <For each={connector.destinations.array}>
                  {(outputConnection) => (
                    <NodeCurve
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
          drawflow.mouseData.heldNodeId && drawflow.mouseData.heldConnectorId
        }
      >
        <Curve css={props?.css?.newCurve} />
      </Show>
    </div>
  </div>
);

export default Drawflow;
