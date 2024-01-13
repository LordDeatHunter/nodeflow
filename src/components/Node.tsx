import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import { drawflow, mouseData, nodes, setNodes } from "../utils";
import { DrawflowNode } from "../drawflow-types";
import { Vec2 } from "../utils/vec2";
import { drawflowEventStore } from "../utils/events";
import { produce } from "solid-js/store";
import Connector from "./Connector";

interface NodeProps {
  nodeId: string;
}

const Node: Component<NodeProps> = (props) => {
  const node = createMemo<DrawflowNode>(() => nodes[props.nodeId]);
  const [isVisible, setIsVisible] = createSignal<boolean>(false);

  createEffect(() => {
    if (mouseData.heldNodeId !== props.nodeId || !mouseData.isDraggingNode) {
      return;
    }

    const position = mouseData.mousePosition
      .divideBy(drawflow.zoomLevel)
      .subtract(mouseData.clickStartPosition ?? Vec2.zero());

    setNodes(props.nodeId, "position", position);
  });

  onCleanup(() => {
    if (!node().resizeObserver) return;

    node().resizeObserver!.disconnect();

    Object.values(node().connectorSections).forEach((section) => {
      Object.values(section.connectors).forEach((connector) => {
        if (!connector.resizeObserver) return;
        connector.resizeObserver.disconnect();
      });
    });
  });

  return (
    <div
      ref={(el) =>
        setTimeout(() => {
          if (!el) return;

          const resizeObserver = new ResizeObserver(() => {
            setNodes(
              props.nodeId,
              produce((prev) => {
                // update the size of the node
                prev.size = Vec2.of(el.clientWidth, el.clientHeight);
                // update the position of the connectors
                Object.entries(prev.connectorSections).forEach(
                  ([sectionId, section]) => {
                    Object.entries(section.connectors).forEach(
                      ([connectorId, connector]) => {
                        const connectorEl = connector.ref;
                        if (!connectorEl) return;
                        prev.connectorSections[sectionId].connectors[
                          connectorId
                        ].position = Vec2.of(
                          (connectorEl?.parentElement?.offsetLeft ?? 0) +
                            connectorEl.offsetLeft,
                          (connectorEl?.parentElement?.offsetTop ?? 0) +
                            connectorEl.offsetTop,
                        );
                      },
                    );
                  },
                );
              }),
            );
          });
          resizeObserver.observe(el);

          const positionOffset = node().centered
            ? Vec2.of(el.clientWidth, el.clientHeight).divideBy(2)
            : Vec2.zero();

          setNodes(props.nodeId, {
            offset: Vec2.of(el.clientLeft, el.clientTop),
            ref: el,
            resizeObserver,
            position: node().position.subtract(positionOffset),
            size: Vec2.of(el.clientWidth, el.clientHeight),
          });

          setIsVisible(true);
        })
      }
      style={{
        left: `${node().position.x}px`,
        top: `${node().position.y}px`,
        opacity: isVisible() ? 1 : 0,
      }}
      classList={{
        [node()?.css?.normal ?? ""]: true,
        [node()?.css?.selected ?? ""]: mouseData.heldNodeId === props.nodeId,
      }}
      onMouseDown={(event) =>
        drawflowEventStore.onMouseDownInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
      onTouchStart={(event) =>
        drawflowEventStore.onTouchStartInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
      onPointerUp={(event) =>
        drawflowEventStore.onPointerUpInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
    >
      {node().display({ node: node() })}
      <For each={Object.entries(node().connectorSections)}>
        {([sectionId, section]) => (
          <div class={section?.css}>
            <For each={Object.entries(section.connectors)}>
              {([connectorId, connector]) => (
                <Connector
                  connector={connector}
                  connectorId={connectorId}
                  nodeId={props.nodeId}
                  sectionId={sectionId}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

export default Node;
