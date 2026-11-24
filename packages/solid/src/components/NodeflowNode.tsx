import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import {
  ConnectorSection,
  NodeflowData,
  NodeflowNodeData,
  Vec2,
} from "@nodeflow-lib/core";
import Connector from "./Connector";
import { applyGridSize, gridSizingKey } from "../grid-sizing";

interface NodeProps {
  nodeId: string;
  nodeflowData: NodeflowData;
  tick: () => number;
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

  // <For> keys items by reference, so list the section and connector objects
  // themselves (stable across redraws) rather than fresh [id, value] pairs.
  const connectorSections = createMemo(() => {
    props.tick();
    const n = props.nodeflowData.nodes.get(props.nodeId);
    return n ? Array.from(n.connectorSections.values()) : [];
  });

  const sectionConnectors = (section: ConnectorSection) => {
    props.tick();
    return Array.from(section.connectors.values());
  };

  const sectionCss = (section: ConnectorSection) => {
    props.tick();
    return section.css ?? "";
  };

  return (
    <div
      ref={(el) => {
        const measure = () => {
          applyGridSize(el, props.nodeflowData);
          const n = props.nodeflowData.nodes.get(props.nodeId);
          if (n) {
            n.updateMeasurements(
              Vec2.of(el.clientWidth, el.clientHeight),
              Vec2.of(el.clientLeft, el.clientTop),
            );
          }
        };

        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(el);
        onCleanup(() => resizeObserver.disconnect());

        // Re-apply grid sizing when its settings change at runtime. Keyed so
        // the forced layout does not run on every content tick (e.g. drags).
        let lastSizingKey = gridSizingKey(props.nodeflowData);
        createEffect(() => {
          props.tick();
          const key = gridSizingKey(props.nodeflowData);
          if (key === lastSizingKey) return;
          lastSizingKey = key;
          measure();
        });

        // Defer centering adjustment until first layout is available
        requestAnimationFrame(() => {
          const n = props.nodeflowData.nodes.get(props.nodeId);
          if (!n) return;

          measure();

          n.applyCenteringOffset(
            Vec2.of(el.clientWidth, el.clientHeight).divideBy(2),
          );

          setIsVisible(true);
        });
      }}
      style={{
        transform: `translate(${nodePosition().x}px, ${nodePosition().y}px)`,
        opacity: isVisible() ? 1 : 0,
        contain: "layout style",
        "will-change": "transform",
      }}
      id={`node-${props.nodeId}`}
      data-nodeflow-node={props.nodeId}
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
      <For each={connectorSections()}>
        {(section) => (
          <div
            classList={{
              [sectionCss(section)]: true,
              nodeflowConnectorSection: true,
            }}
            id={`section-${section.id}`}
          >
            <For each={sectionConnectors(section)}>
              {(connector) => (
                <Connector
                  connector={connector}
                  connectorId={connector.id}
                  nodeId={props.nodeId}
                  sectionId={section.id}
                  nodeflowData={props.nodeflowData}
                  tick={props.tick}
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
