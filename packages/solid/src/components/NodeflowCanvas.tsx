import { Component, createMemo, For, onCleanup, Show } from "solid-js";
import {
  NodeflowData,
  NodeflowCss,
  Vec2,
  SelectableElementCSS,
} from "@nodeflow/core";
import { NodeflowRegistry } from "@nodeflow/core";
import NodeflowNode from "./NodeflowNode";
import NodeCurve from "./NodeCurve";
import Curve from "./Curve";
import SelectionBox from "./SelectionBox";
import { createTick } from "../tick";

interface NodeflowProps {
  css?: NodeflowCss;
  height?: string;
  width?: string;
}

const NodeflowCanvas =
  (nodeflowData: NodeflowData): Component<NodeflowProps> =>
  (props) => {
    const { tick, markDirty } = createTick();

    const dirtyKey = "nodeflow-canvas-dirty-" + nodeflowData.id;
    NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.subscribe(
      dirtyKey,
      markDirty,
    );
    NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.subscribe(
      dirtyKey,
      markDirty,
    );
    NodeflowRegistry.get().globalEventStore.onPointerLeaveFromDocument.subscribe(
      dirtyKey,
      markDirty,
    );

    onCleanup(() => {
      NodeflowRegistry.get().globalEventStore.onMouseMoveInDocument.unsubscribe(
        dirtyKey,
      );
      NodeflowRegistry.get().globalEventStore.onPointerUpInDocument.unsubscribe(
        dirtyKey,
      );
      NodeflowRegistry.get().globalEventStore.onPointerLeaveFromDocument.unsubscribe(
        dirtyKey,
      );
    });

    const nodeIds = createMemo(() => {
      tick();
      return Array.from(nodeflowData.nodes.keys());
    });

    const connectionList = createMemo(() => {
      tick();
      const out: Array<{
        sourceNodeId: string;
        sourceConnectorId: string;
        destinationNodeId: string;
        destinationConnectorId: string;
        css: SelectableElementCSS;
      }> = [];

      for (const [nodeId, node] of nodeflowData.nodes) {
        for (const section of node.connectorSections.values()) {
          for (const connector of section.connectors.values()) {
            for (const dest of connector.destinations.array) {
              out.push({
                sourceNodeId: nodeId,
                sourceConnectorId: connector.id,
                destinationNodeId:
                  dest.destinationConnector.parentSection.parentNode.id,
                destinationConnectorId: dest.destinationConnector.id,
                css: dest.css,
              });
            }
          }
        }
      }

      return out;
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
            markDirty();
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
          markDirty();
          nodeflowData.eventStore.onMouseMoveInNodeflow.publish({ event });
        }}
        onPointerUp={(event) => {
          markDirty();
          nodeflowData.eventStore.onPointerUpInNodeflow.publish({ event });
        }}
        onWheel={(event) => {
          markDirty();
          nodeflowData.eventStore.onWheelInNodeflow.publish({ event });
        }}
        onMouseDown={(event) => {
          markDirty();
          nodeflowData.eventStore.onMouseDownInNodeflow.publish({ event });
        }}
        onKeyDown={(event) => {
          markDirty();
          nodeflowData.eventStore.onKeyDownInNodeflow.publish({ event });
        }}
        onKeyUp={(event) => {
          markDirty();
          nodeflowData.eventStore.onKeyUpInNodeflow.publish({ event });
        }}
        onTouchStart={(event) => {
          markDirty();
          nodeflowData.eventStore.onTouchStartInNodeflow.publish({ event });
        }}
        onTouchMove={(event) => {
          markDirty();
          nodeflowData.eventStore.onTouchMoveInNodeflow.publish({ event });
        }}
        onTouchEnd={(event) => {
          markDirty();
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
          markDirty();
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
                markDirty={markDirty}
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
