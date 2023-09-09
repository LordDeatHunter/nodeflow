import { Component, createSignal, For, Show } from "solid-js";
import { dividePosition, subtractPositions } from "../utils/math-utils";
import {
  Constants,
  deselectNode,
  drawflow,
  heldKeys,
  mouseData,
  nodes,
  removeNode,
  resetMovement,
  setMouseData,
  updateBackgroundPosition,
  updateZoom,
} from "../utils/drawflow-storage";
import Node from "./Node";
import Curve from "./Curve";

const Drawflow: Component = () => {
  const [pinchDistance, setPinchDistance] = createSignal(0);

  return (
    <div
      tabIndex="0"
      style={{
        height: `${window.innerHeight}px`,
        overflow: "hidden",
        position: "absolute",
        width: `${window.innerWidth}px`,
      }}
      onMouseMove={(e) => {
        setMouseData("mousePosition", { x: e.clientX, y: e.clientY });
        updateBackgroundPosition({ x: e.movementX, y: e.movementY });
      }}
      onPointerUp={() => {
        setMouseData("dragging", false);
      }}
      onWheel={(e) => {
        e.preventDefault();
        updateZoom(-e.deltaY, { x: e.clientX, y: e.clientY });
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        resetMovement();
        setMouseData({
          dragging: true,
          heldNodeId: undefined,
          mousePosition: { x: event.clientX, y: event.clientY },
          startPosition: {
            x: event.clientX / drawflow.zoomLevel - drawflow.position.x,
            y: event.clientY / drawflow.zoomLevel - drawflow.position.y,
          },
        });
      }}
      onKeyDown={(e) => {
        switch (e.code) {
          case "Delete":
            if (mouseData.heldNodeId) {
              removeNode(mouseData.heldNodeId);
            }
            break;
          case "Escape":
            deselectNode();
            break;
          case "Space":
            if (mouseData.heldNodeId) {
              console.log(nodes[mouseData.heldNodeId]);
            }
            break;
          case "Equal":
          case "Minus":
            if (e.ctrlKey) {
              e.preventDefault();
              updateZoom(
                Constants.KEYBOARD_ZOOM_AMOUNT * (e.code === "Equal" ? 1 : -1),
                {
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                }
              );
            }
            break;
        }
        heldKeys.add(e.code);
      }}
      onKeyUp={(e) => {
        heldKeys.delete(e.code);
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
        const touch = event.touches[0];
        const mousePosition = { x: touch.clientX, y: touch.clientY };
        if (event.touches.length === 2) {
          setMouseData({
            dragging: false,
            heldNodeId: undefined,
            mousePosition,
          });
          const { pageX: touch1X, pageY: touch1Y } = event.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = event.touches[1];
          setPinchDistance(Math.hypot(touch1X - touch2X, touch1Y - touch2Y));
          return;
        }
        if (event.touches.length === 1) {
          heldKeys.clear();
        }
        setMouseData({
          dragging: event.touches.length === 1,
          heldNodeId: undefined,
          mousePosition,
          startPosition: subtractPositions(
            dividePosition(mousePosition, drawflow.zoomLevel),
            drawflow.position
          ),
        });
      }}
      onTouchMove={(e) => {
        if (e.touches.length == 2) {
          const { pageX: touch1X, pageY: touch1Y } = e.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = e.touches[1];
          const currDist = Math.hypot(touch1X - touch2X, touch1Y - touch2Y);
          const centerPosition = {
            x: (touch1X + touch2X) / 2,
            y: (touch1Y + touch2Y) / 2,
          };
          updateZoom(currDist - pinchDistance(), centerPosition);
          setPinchDistance(currDist);
          return;
        }
        setMouseData("mousePosition", (mousePosition) => {
          const newMousePos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
          updateBackgroundPosition(
            subtractPositions(newMousePos, mousePosition)
          );
          return newMousePos;
        });
      }}
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
          {([nodeId, nodeData]) => (
            <>
              <Node css={nodeData.css} nodeId={nodeId}>
                <h1>ID: {nodeId}</h1>
              </Node>
              <For each={Object.entries(nodes[nodeId]!.outputs)}>
                {([outputId, output]) => (
                  <For each={output.destinations}>
                    {(outputConnection) => (
                      <Show
                        when={
                          !!outputConnection?.destinationNodeId &&
                          !!outputConnection?.destinationInputId &&
                          Object.keys(nodes).includes(
                            outputConnection.destinationNodeId!
                          )
                        }
                      >
                        <Curve
                          nodeId={nodeId}
                          outputId={outputId}
                          destinationNodeId={
                            outputConnection.destinationNodeId!
                          }
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
      </div>
    </div>
  );
};

export default Drawflow;
