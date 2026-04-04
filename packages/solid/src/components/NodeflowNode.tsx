import {
  type Component,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import { NodeflowData, NodeflowNodeData, Vec2 } from "@nodeflow/core";
import Connector from "./Connector";

// TODO: Probably better to pass the node data directly instead of the id.
interface NodeProps {
  nodeId: string;
  nodeflowData: NodeflowData;
}

const NodeflowNode: Component<NodeProps> = (props) => {
  const node = createMemo<NodeflowNodeData>(
    () => props.nodeflowData.nodes.get(props.nodeId)!,
  );
  const [isVisible, setIsVisible] = createSignal<boolean>(false);

  onCleanup(() => {
    props.nodeflowData.chunking.removeNodeFromChunk(
      props.nodeId,
      node().position,
    );
  });

  return (
    <div
      ref={(el) =>
        setTimeout(() => {
          if (!el) return;

          const resizeObserver = new ResizeObserver(() => {
            node().updateMeasurements(
              Vec2.of(el.clientWidth, el.clientHeight),
              Vec2.of(el.clientLeft, el.clientTop),
            );
          });
          resizeObserver.observe(el);

          const positionOffset = node().centered
            ? Vec2.of(el.clientWidth, el.clientHeight).divideBy(2)
            : Vec2.zero();

          node().update({
            position: node().position.subtract(positionOffset),
          });
          node().updateMeasurements(
            Vec2.of(el.clientWidth, el.clientHeight),
            Vec2.of(el.clientLeft, el.clientTop),
          );

          setIsVisible(true);
        })
      }
      style={{
        left: `${node().position.x}px`,
        top: `${node().position.y}px`,
        opacity: isVisible() ? 1 : 0,
      }}
      id={`node-${props.nodeId}`}
      class="nodeflowNode"
      classList={{
        [node()?.css?.normal ?? ""]: true,
        [node()?.css?.selected ?? ""]:
          props.nodeflowData.mouseData.hasSelectedNode(props.nodeId) ||
          props.nodeflowData.mouseData.selectionBox.selections.isNodeSelected(
            props.nodeId,
          ),
      }}
      onMouseDown={(event) =>
        props.nodeflowData.eventStore.onMouseDownInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
      onTouchStart={(event) =>
        props.nodeflowData.eventStore.onTouchStartInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
      onPointerUp={(event) =>
        props.nodeflowData.eventStore.onPointerUpInNode.publish({
          event,
          nodeId: props.nodeId,
        })
      }
    >
      {node().display({ node: node() })}
      <For each={Array.from(node().connectorSections.entries())}>
        {([sectionId, section]) => (
          <div
            classList={{
              [section?.css ?? ""]: true,
              nodeflowConnectorSection: true,
            }}
            id={`section-${sectionId}`}
          >
            <For each={Array.from(section.connectors.entries())}>
              {([connectorId, connector]) => (
                <Connector
                  connector={connector}
                  connectorId={connectorId}
                  nodeId={props.nodeId}
                  sectionId={sectionId}
                  nodeflowData={props.nodeflowData}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

export default NodeflowNode;
