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
  mouseData,
  nodes,
  removeNode,
  setMouseData,
} from "../utils/NodeStorage";
import { getScreenSize } from "../utils/screen-utils";
import Node from "./Node";
import Curve from "./Curve";

export const [drawflowPos, setDrawflowPos] = createSignal<Position>({
  x: 0,
  y: 0,
});
export const [zoomLevel, setZoomLevel] = createSignal<number>(1);

export const MAX_ZOOM = 200;
export const MIN_ZOOM = 0.02;
export const ZOOM_MULTIPLIER = 0.005;

const Drawflow: Component = () => {
  const [dist, setDist] = createSignal(0);

  const updateZoom = (distance: number, zoomLocation: Position): void => {
    const oldZoom = zoomLevel();
    const newZoom = clamp(
      oldZoom + oldZoom * distance * ZOOM_MULTIPLIER,
      MIN_ZOOM,
      MAX_ZOOM
    );
    if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) return;
    setMouseData("dragging", false);
    setZoomLevel(newZoom);
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
    setDrawflowPos((prev) => ({
      x: prev.x - oldOffset.x + newOffset.x,
      y: prev.y - oldOffset.y + newOffset.y,
    }));
    return;
  };

  const updateBackgroundPosition = (moveDistance: Position) => {
    if (mouseData.heldNodeId || !mouseData.dragging) return;
    setDrawflowPos((prev) => ({
      x: prev.x + moveDistance.x / zoomLevel(),
      y: prev.y + moveDistance.y / zoomLevel(),
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
            x: event.clientX / zoomLevel() - drawflowPos().x,
            y: event.clientY / zoomLevel() - drawflowPos().y,
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
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (event.touches.length === 2) {
          setMouseData({
            dragging: false,
            heldNodeId: undefined,
            mousePosition: { x: touch.clientX, y: touch.clientY },
          });
          const { pageX: touch1X, pageY: touch1Y } = event.touches[0];
          const { pageX: touch2X, pageY: touch2Y } = event.touches[1];
          setDist(Math.hypot(touch1X - touch2X, touch1Y - touch2Y));
          return;
        }
        setMouseData({
          dragging: event.touches.length === 1,
          heldNodeId: undefined,
          mousePosition: { x: touch.clientX, y: touch.clientY },
          startPosition: {
            x: touch.clientX / zoomLevel() - drawflowPos().x,
            y: touch.clientY / zoomLevel() - drawflowPos().y,
          },
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
          updateZoom(currDist - dist(), centerPosition);
          setDist(currDist);
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
          transform: `scale(${zoomLevel()}) translate(${drawflowPos().x}px, ${
            drawflowPos().y
          }px)`,
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
                          !!outputConnection?.destinationInputId
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
