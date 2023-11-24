import { Component, For } from "solid-js";
import { drawflow, getAllConnectors, nodes, windowSize } from "../utils";
import Node from "./Node";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import {
  ConnectorDestination,
  DrawflowCss,
  NodeConnector,
} from "../drawflow-types";
import { drawflowEventStore } from "../utils/events";

interface DrawflowProps {
  css?: DrawflowCss;
}

const Drawflow: Component<DrawflowProps> = (props) => (
  <div
    tabIndex="0"
    style={{
      height: `${windowSize().y}px`,
      overflow: "hidden",
      position: "absolute",
      width: `${windowSize().x}px`,
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
        height: "100%",
        position: "absolute",
        transform: `scale(${drawflow.zoomLevel}) translate(${drawflow.position.x}px, ${drawflow.position.y}px)`,
        "transform-origin": "center",
        width: "100%",
      }}
    >
      <For each={Object.entries(nodes)}>
        {([nodeId]) => (
          <>
            <Node nodeId={nodeId} />
            <For each={getAllConnectors(nodeId)}>
              {(connector: NodeConnector) => (
                <For each={connector.destinations}>
                  {(outputConnection: ConnectorDestination) => (
                    <NodeCurve
                      nodeId={nodeId}
                      outputId={connector.id}
                      destinationNodeId={
                        outputConnection.destinationConnector!.parentSection
                          .parentNode.id
                      }
                      destinationConnectorId={
                        outputConnection.destinationConnector!.id
                      }
                      css={outputConnection.css}
                    />
                  )}
                </For>
              )}
            </For>
          </>
        )}
      </For>
      <Curve css={props?.css?.newCurve} />
    </div>
  </div>
);

export default Drawflow;
