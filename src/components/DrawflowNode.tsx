import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import { drawflow, drawflowEventStore } from "../utils";
import Vec2 from "../utils/data/Vec2";
import Connector from "./Connector";
import DrawflowNodeData from "../utils/data/DrawflowNodeData";

interface NodeProps {
  nodeId: string;
}

const DrawflowNode: Component<NodeProps> = (props) => {
  const node = createMemo<DrawflowNodeData>(
    () => drawflow.nodes.get(props.nodeId)!,
  );
  const [isVisible, setIsVisible] = createSignal<boolean>(false);

  createEffect(() => {
    if (
      drawflow.mouseData.heldNodeId !== props.nodeId ||
      !drawflow.mouseData.isDraggingNode
    ) {
      return;
    }

    node().position = drawflow.mouseData.mousePosition
      .divideBy(drawflow.zoomLevel)
      .subtract(drawflow.mouseData.clickStartPosition ?? Vec2.zero());
  });

  onCleanup(() => {
    if (!node().resizeObserver) return;

    node().resizeObserver!.disconnect();

    Array.from(node().connectorSections.values()).forEach((section) => {
      Array.from(section.connectors.values()).forEach((connector) => {
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
            node().update({
              // update the size of the node
              size: Vec2.of(el.clientWidth, el.clientHeight),
            });

            // update the position of the connectors
            Array.from(node().connectorSections.values()).forEach((section) =>
              Array.from(section.connectors.values()).forEach((connector) => {
                const connectorEl = connector.ref;
                if (!connectorEl) return;

                connector.position = Vec2.of(
                  (connectorEl?.parentElement?.offsetLeft ?? 0) +
                    connectorEl.offsetLeft,
                  (connectorEl?.parentElement?.offsetTop ?? 0) +
                    connectorEl.offsetTop,
                );
              }),
            );
          });
          resizeObserver.observe(el);

          const positionOffset = node().centered
            ? Vec2.of(el.clientWidth, el.clientHeight).divideBy(2)
            : Vec2.zero();

          node().update({
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
        [node()?.css?.selected ?? ""]:
          drawflow.mouseData.heldNodeId === props.nodeId,
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
      <For each={Array.from(node().connectorSections.entries())}>
        {([sectionId, section]) => (
          <div class={section?.css}>
            <For each={Array.from(section.connectors.entries())}>
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

export default DrawflowNode;
