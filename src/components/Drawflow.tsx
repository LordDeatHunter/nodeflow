import { Component, createSignal, For, Show } from "solid-js";
import { Position } from "../types/types";
import {
  clamp,
  convertSizeToPosition,
  dividePosition,
  multiplyPosition,
  subtractPositions,
} from "../utils/math-utils";
import {
  Constants,
  drawflow,
  mouseData,
  nodes,
  removeNode,
  setDrawflow,
  setMouseData,
} from "../utils/drawflow-storage";
import { getScreenSize } from "../utils/screen-utils";
import Node from "./Node";
import Curve from "./Curve";

const Drawflow: Component = () => {
  const [pinchDistance, setPinchDistance] = createSignal(0);

  const updateZoom = (distance: number, zoomLocation: Position): void => {
    const oldZoom = drawflow.zoomLevel;
    const newZoom = clamp(
      oldZoom + oldZoom * distance * Constants.ZOOM_MULTIPLIER,
      Constants.MIN_ZOOM,
      Constants.MAX_ZOOM
    );
    if (newZoom < Constants.MIN_ZOOM || newZoom > Constants.MAX_ZOOM) return;
    setMouseData("dragging", false);
    const windowDimensions = convertSizeToPosition(getScreenSize());
    const centeredZoomLocation = subtractPositions(
      zoomLocation,
      dividePosition(windowDimensions, 2)
    );
    const oldScreenSize = multiplyPosition(windowDimensions, oldZoom);
    const newScreenSize = multiplyPosition(windowDimensions, newZoom);
    const oldOffset = dividePosition(
      subtractPositions(centeredZoomLocation, dividePosition(oldScreenSize, 2)),
      oldZoom
    );
    const newOffset = dividePosition(
      subtractPositions(centeredZoomLocation, dividePosition(newScreenSize, 2)),
      newZoom
    );
    setDrawflow((prev) => ({
      position: {
        x: prev.position.x - oldOffset.x + newOffset.x,
        y: prev.position.y - oldOffset.y + newOffset.y,
      },
      zoomLevel: newZoom,
    }));
  };

  const updateBackgroundPosition = (
    moveDistance: Position,
    keyboard = false
  ) => {
    if (mouseData.heldNodeId || (!mouseData.dragging && !keyboard)) return;
    setDrawflow("position", (prev) => ({
      x: prev.x + moveDistance.x / drawflow.zoomLevel,
      y: prev.y + moveDistance.y / drawflow.zoomLevel,
    }));
  };

  return (
    <div
      tabIndex="0"
      style={{
        position: "absolute",
        overflow: "hidden",
        width: `${window.innerWidth}px`,
        height: `${window.innerHeight}px`,
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
        if (e.code === "Delete" && mouseData.heldNodeId) {
          removeNode(mouseData.heldNodeId);
        }
        if (e.code === "Space" && mouseData.heldNodeId) {
          console.log(nodes[mouseData.heldNodeId]);
        }
        switch (e.code) {
          case "ArrowLeft":
            updateBackgroundPosition(
              { x: Constants.MOVE_DISTANCE, y: 0 },
              true
            );
            break;
          case "ArrowRight":
            updateBackgroundPosition(
              { x: -Constants.MOVE_DISTANCE, y: 0 },
              true
            );
            break;
          case "ArrowUp":
            updateBackgroundPosition(
              { x: 0, y: Constants.MOVE_DISTANCE },
              true
            );
            break;
          case "ArrowDown":
            updateBackgroundPosition(
              { x: 0, y: -Constants.MOVE_DISTANCE },
              true
            );
            break;
        }
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
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${drawflow.zoomLevel}) translate(${drawflow.position.x}px, ${drawflow.position.y}px)`,
          "transform-origin": "center",
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
