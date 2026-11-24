import { Vec2, NodeflowData, NodeConnector } from "@nodeflow-lib/core";
import { Component, createEffect, onCleanup } from "solid-js";

interface ConnectorProps {
  connector: NodeConnector;
  connectorId: string;
  nodeId: string;
  sectionId: string;
  nodeflowData: NodeflowData;
  /** Re-reads the connector's css on each tick when provided. */
  tick?: () => number;
}

const Connector: Component<ConnectorProps> = (props) => (
  <div
    ref={(el) => {
      const measure = () => {
        const connector = props.nodeflowData.nodes
          .get(props.nodeId)
          ?.connectorSections.get(props.sectionId)
          ?.connectors.get(props.connectorId);
        if (!connector || !el.isConnected) return;

        connector.updateMeasurements(
          Vec2.of(
            (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
            (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
          ),
          Vec2.of(el.offsetWidth, el.offsetHeight),
        );
      };

      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
      // A connector also moves without resizing when its section resizes or
      // a sibling connector is added or removed, so watch the section too.
      const siblingObserver = new MutationObserver(measure);
      onCleanup(() => {
        resizeObserver.disconnect();
        siblingObserver.disconnect();
      });

      // Rotating the node can move its connectors to other edges without
      // resizing anything; re-measure once the new layout is in.
      let lastRotation: number | undefined;
      createEffect(() => {
        props.tick?.();
        const rotation = props.nodeflowData.nodes.get(props.nodeId)?.rotation;
        if (rotation === lastRotation) return;
        const first = lastRotation === undefined;
        lastRotation = rotation;
        if (!first) requestAnimationFrame(measure);
      });

      // The element is only in its section once it has been inserted.
      requestAnimationFrame(() => {
        const section = el.parentElement;
        if (section) {
          resizeObserver.observe(section);
          siblingObserver.observe(section, { childList: true });
        }
        measure();
      });
    }}
    class={(props.tick?.(), props.connector?.css)}
    id={`connector-${props.connectorId}`}
    data-nodeflow-connector={props.connectorId}
    data-nodeflow-node={props.nodeId}
    onMouseDown={(event) =>
      props.nodeflowData.eventStore.onMouseDownInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
    onTouchStart={(event) =>
      props.nodeflowData.eventStore.onTouchStartInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
    onPointerUp={(event) =>
      props.nodeflowData.eventStore.onPointerUpInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
  />
);

export default Connector;
