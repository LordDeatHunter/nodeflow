import { Component, For, Show } from "solid-js";
import { drawflow, nodes } from "../utils/drawflow-storage";
import Node from "./Node";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import { DrawflowCss } from "../types/types";
import { DrawflowFunctions } from "../utils/drawflow-functions";

interface DrawflowProps {
  css?: DrawflowCss;
}

const Drawflow: Component<DrawflowProps> = (props) => (
  <div
    tabIndex="0"
    style={{
      height: `${window.innerHeight}px`,
      overflow: "hidden",
      position: "absolute",
      width: `${window.innerWidth}px`,
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
            <For each={Object.entries(nodes[nodeId]!.outputs)}>
              {([outputId, output]) => (
                <For each={output.destinations}>
                  {(outputConnection) => (
                    <Show
                      when={
                        !!outputConnection?.destinationNodeId &&
                        !!outputConnection?.destinationInputId &&
                        Object.keys(nodes).includes(
                          outputConnection.destinationNodeId!,
                        )
                      }
                    >
                      <NodeCurve
                        nodeId={nodeId}
                        outputId={outputId}
                        destinationNodeId={outputConnection.destinationNodeId!}
                        destinationInputId={
                          outputConnection.destinationInputId!
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
