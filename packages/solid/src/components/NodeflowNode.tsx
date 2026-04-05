import {
  type Component,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import { NodeflowData, NodeflowNodeData, Vec2 } from "@nodeflow/core";
import Connector from "./Connector";

interface NodeProps {
  nodeId: string;
  nodeflowData: NodeflowData;
  tick: () => number;
  markDirty?: () => void;
}

const NodeflowNode: Component<NodeProps> = (props) => {
  const node = createMemo<NodeflowNodeData>(() => {
    props.tick();
    return props.nodeflowData.nodes.get(props.nodeId)!;
  });

  const [isVisible, setIsVisible] = createSignal<boolean>(false);

  const nodePosition = createMemo(() => {
    props.tick();
    const n = props.nodeflowData.nodes.get(props.nodeId);
    return n ? n.position : Vec2.zero();
  });

  const isSelected = createMemo(() => {
    props.tick();
    return (
      props.nodeflowData.mouseData.hasSelectedNode(props.nodeId) ||
      props.nodeflowData.mouseData.selectionBox.selections.isNodeSelected(
        props.nodeId,
      )
    );
  });

  const connectorSectionEntries = createMemo(() => {
    props.tick();
    const n = props.nodeflowData.nodes.get(props.nodeId);
    return n ? Array.from(n.connectorSections.entries()) : [];
  });

  onCleanup(() => {
    const n = props.nodeflowData.nodes.get(props.nodeId);
    if (n) {
      props.nodeflowData.chunking.removeNodeFromChunk(props.nodeId, n.position);
    }
  });

  return (
    <div
      ref={(el) => {
        const measure = () => {
          const n = props.nodeflowData.nodes.get(props.nodeId);
          if (n) {
            n.updateMeasurements(
              Vec2.of(el.clientWidth, el.clientHeight),
              Vec2.of(el.clientLeft, el.clientTop),
            );
          }
        };

        const resizeObserver = new ResizeObserver(() => {
          measure();
          props.markDirty?.();
        });
        resizeObserver.observe(el);

        // Defer centering adjustment until first layout is available
        requestAnimationFrame(() => {
          const n = props.nodeflowData.nodes.get(props.nodeId);
          if (!n) return;

          measure();

          const positionOffset = n.centered
            ? Vec2.of(el.clientWidth, el.clientHeight).divideBy(2)
            : Vec2.zero();

          n.update({
            position: n.position.subtract(positionOffset),
          });

          setIsVisible(true);
        });
      }}
      style={{
        transform: `translate(${nodePosition().x}px, ${nodePosition().y}px)`,
        opacity: isVisible() ? 1 : 0,
        contain: "content",
        "will-change": "transform",
      }}
      id={`node-${props.nodeId}`}
      class="nodeflowNode"
      classList={{
        [node()?.css?.normal ?? ""]: true,
        [node()?.css?.selected ?? ""]: isSelected(),
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
      <For each={connectorSectionEntries()}>
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
