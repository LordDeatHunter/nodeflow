import { Component, For, Show } from "solid-js";
import {
  drawflow,
  DrawflowFunctions,
  getAllConnectors,
  nodes,
  windowSize,
} from "../utils";
import Node from "./Node";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import { DrawflowCss } from "../drawflow-types";

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
    {...DrawflowFunctions}
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
              {(connector) => (
                <For each={connector.destinations}>
                  {(outputConnection) => (
                    <Show
                      when={
                        !!outputConnection?.destinationNodeId &&
                        !!outputConnection?.destinationConnectorId &&
                        Object.keys(nodes).includes(
                          outputConnection.destinationNodeId!,
                        )
                      }
                    >
                      <NodeCurve
                        nodeId={nodeId}
                        outputId={connector.connectorId}
                        destinationNodeId={outputConnection.destinationNodeId!}
                        destinationConnectorId={
                          outputConnection.destinationConnectorId!
                        }
                        css={outputConnection.css}
                      />
                    </Show>
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
