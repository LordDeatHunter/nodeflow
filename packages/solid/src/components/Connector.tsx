import { Vec2, NodeflowData, NodeConnector } from "@nodeflow/core";
import { Component } from "solid-js";

interface ConnectorProps {
  connector: NodeConnector;
  connectorId: string;
  nodeId: string;
  sectionId: string;
  nodeflowData: NodeflowData;
}

const Connector: Component<ConnectorProps> = (props) => (
  <div
    ref={(el) => {
      const measure = () => {
        if (!props.nodeflowData.nodes.has(props.nodeId)) return;

        const connector = props.nodeflowData.nodes
          .get(props.nodeId)!
          .connectorSections.get(props.sectionId)!
          .connectors.get(props.connectorId)!;

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

      requestAnimationFrame(measure);
    }}
    class={props.connector?.css}
    id={`connector-${props.connectorId}`}
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
