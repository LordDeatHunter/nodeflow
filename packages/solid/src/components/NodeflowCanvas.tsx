import { Component, createMemo, For, onCleanup, Show } from "solid-js";
import {
  ConnectorDestination,
  NodeflowData,
  NodeflowCss,
  NodeflowRegistry,
  Vec2,
  SelectableElementCSS,
} from "@nodeflow-lib/core";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import SelectionBox from "./SelectionBox";
import { createTick } from "../tick";

interface ConnectionEntry {
  sourceNodeId: string;
  sourceConnectorId: string;
  destinationNodeId: string;
  destinationConnectorId: string;
  css: SelectableElementCSS;
}

interface NodeflowProps {
  css?: NodeflowCss;
  height?: string;
  width?: string;
}

const NodeflowCanvas =
  (nodeflowData: NodeflowData): Component<NodeflowProps> =>
  (props) => {
    // Nodes, connectors, curves and selections redraw on `tick`; the canvas
    // transform has its own `viewTick`, so panning and zooming never
    // re-evaluate per-node and per-curve memos.
    const { tick, markDirty } = createTick();
    const { tick: viewTick, markDirty: markViewDirty } = createTick();

    const contentKey = "nodeflow-canvas-content-" + nodeflowData.id;
    nodeflowData.eventStore.onContentChanged.subscribe(contentKey, markDirty);

    const transformKey = "nodeflow-canvas-transform-" + nodeflowData.id;
    nodeflowData.eventStore.onCanvasTransformChanged.subscribe(
      transformKey,
      markViewDirty,
    );

    // The new-connection preview follows the pointer, which core does not
    // report as a content change.
    const pointerKey = "nodeflow-canvas-pointer-" + nodeflowData.id;
    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.subscribe(
      pointerKey,
      () => {
        if (nodeflowData.mouseData.heldConnectors.length === 1) markDirty();
      },
    );

    onCleanup(() => {
      nodeflowData.eventStore.onContentChanged.unsubscribe(contentKey);
      nodeflowData.eventStore.onCanvasTransformChanged.unsubscribe(
        transformKey,
      );
      NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.unsubscribe(
        pointerKey,
      );
    });

    const nodeIds = createMemo(() => {
      tick();
      return Array.from(nodeflowData.nodes.keys());
    });

    // <For> keys items by reference, so each connection must map to the same
    // entry object across redraws or its curve is torn down and rebuilt.
    const connectionEntries = new WeakMap<
      ConnectorDestination,
      ConnectionEntry
    >();

    const connectionList = createMemo(() => {
      tick();
      const out: ConnectionEntry[] = [];

      for (const [nodeId, node] of nodeflowData.nodes) {
        for (const section of node.connectorSections.values()) {
          for (const connector of section.connectors.values()) {
            for (const dest of connector.destinations.array) {
              const destinationNodeId =
                dest.destinationConnector.parentSection.parentNode.id;
              const destinationConnectorId = dest.destinationConnector.id;
              let entry = connectionEntries.get(dest);

              if (
                !entry ||
                entry.sourceNodeId !== nodeId ||
                entry.sourceConnectorId !== connector.id ||
                entry.destinationNodeId !== destinationNodeId ||
                entry.destinationConnectorId !== destinationConnectorId ||
                entry.css !== dest.css
              ) {
                entry = {
                  sourceNodeId: nodeId,
                  sourceConnectorId: connector.id,
                  destinationNodeId,
                  destinationConnectorId,
                  css: dest.css,
                };
                connectionEntries.set(dest, entry);
              }

              out.push(entry);
            }
          }
        }
      }

      return out;
    });

    const transform = createMemo(() => {
      viewTick();
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

    const nodeBoundary = createMemo(() => {
      viewTick();
      return nodeflowData.settings.nodeBoundary;
    });

    const resolveTouchDrop = (touch: Touch) => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const connectorEl = target?.closest<HTMLElement>(
        "[data-nodeflow-connector]",
      );
      if (
        connectorEl?.dataset.nodeflowNode &&
        connectorEl.dataset.nodeflowConnector
      ) {
        nodeflowData.eventStore.onPointerUpInConnector.publish({
          nodeId: connectorEl.dataset.nodeflowNode,
          connectorId: connectorEl.dataset.nodeflowConnector,
          event: touch as unknown as PointerEvent,
        });
        return;
      }

      const nodeEl = target?.closest<HTMLElement>("[data-nodeflow-node]");
      if (nodeEl?.dataset.nodeflowNode) {
        nodeflowData.eventStore.onPointerUpInNode.publish({
          nodeId: nodeEl.dataset.nodeflowNode,
          event: touch as unknown as PointerEvent,
        });
        return;
      }

      nodeflowData.eventStore.onPointerUpInNodeflow.publish({
        event: touch as unknown as PointerEvent,
      });
    };

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
        class={`nodeflowCanvas ${props?.css?.nodeflow ?? ""}`}
        style={{
          height: props.height ?? "100%",
          width: props.width ?? "100%",
          overflow: "hidden",
          "touch-action": "none",
          "overscroll-behavior": "contain",
        }}
        onMouseMove={(event) => {
          nodeflowData.eventStore.onMouseMoveInNodeflow.publish({ event });
        }}
        onPointerUp={(event) => {
          nodeflowData.eventStore.onPointerUpInNodeflow.publish({ event });
        }}
        onWheel={(event) => {
          nodeflowData.eventStore.onWheelInNodeflow.publish({ event });
        }}
        onMouseDown={(event) => {
          nodeflowData.eventStore.onMouseDownInNodeflow.publish({ event });
        }}
        onKeyDown={(event) => {
          nodeflowData.eventStore.onKeyDownInNodeflow.publish({ event });
        }}
        onKeyUp={(event) => {
          nodeflowData.eventStore.onKeyUpInNodeflow.publish({ event });
        }}
        onTouchStart={(event) => {
          nodeflowData.eventStore.onTouchStartInNodeflow.publish({ event });
        }}
        onTouchMove={(event) => {
          nodeflowData.eventStore.onTouchMoveInNodeflow.publish({ event });
          if (nodeflowData.mouseData.heldConnectors.length === 1) markDirty();
        }}
        onTouchEnd={(event) => {
          if (
            !nodeflowData.mouseData.pinching &&
            nodeflowData.mouseData.heldConnectors.length === 1 &&
            event.touches.length === 0
          ) {
            const touch = event.changedTouches[0];
            if (touch) resolveTouchDrop(touch);
          }
          nodeflowData.eventStore.onTouchEndInNodeflow.publish({ event });
        }}
        onTouchCancel={(event) => {
          nodeflowData.eventStore.onTouchCancelInNodeflow.publish({ event });
        }}
      >
        <div
          style={{
            position: "absolute",
            transform: transform(),
            "transform-origin": "center",
            transition: "scale 0.1s ease-out",
          }}
        >
          <Show when={nodeBoundary()}>
            {(boundary) => {
              const start = () => boundary().startPosition();
              const end = () => boundary().endPosition();
              return (
                <div
                  class="nodeflowBoundary"
                  style={{
                    left: `${start().x}px`,
                    top: `${start().y}px`,
                    width: `${end().x - start().x}px`,
                    height: `${end().y - start().y}px`,
                  }}
                />
              );
            }}
          </Show>
          <svg
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              "pointer-events": "none",
              overflow: "visible",
            }}
          >
            <For each={connectionList()}>
              {(conn) => (
                <NodeCurve
                  nodeflowData={nodeflowData}
                  sourceNodeId={conn.sourceNodeId}
                  sourceConnectorId={conn.sourceConnectorId}
                  destinationNodeId={conn.destinationNodeId}
                  destinationConnectorId={conn.destinationConnectorId}
                  css={conn.css}
                  tick={tick}
                />
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
          <For each={nodeIds()}>
            {(nodeId) => (
              <NodeflowNode
                nodeId={nodeId}
                nodeflowData={nodeflowData}
                tick={tick}
              />
            )}
          </For>
        </div>
        <Show when={selectionBoxBounds()}>
          <SelectionBox nodeflowData={nodeflowData} tick={tick} />
        </Show>
      </div>
    );
  };

export default NodeflowCanvas;
