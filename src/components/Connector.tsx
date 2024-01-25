import Vec2 from "../utils/data/Vec2";
import { NodeflowData } from "../utils";
import { Component } from "solid-js";
import NodeConnector from "../utils/data/NodeConnector";

interface ConnectorProps {
  connector: NodeConnector;
  connectorId: string;
  nodeId: string;
  sectionId: string;
  nodeflowData: NodeflowData;
}

const Connector: Component<ConnectorProps> = (props) => (
  <div
    ref={(el) =>
      setTimeout(() => {
        if (!el) return;

        const connector = props.nodeflowData.nodes
          .get(props.nodeId)!
          .connectorSections.get(props.sectionId)!
          .connectors.get(props.connectorId)!;

        const resizeObserver = new ResizeObserver(() => {
          connector.size = Vec2.of(el.offsetWidth, el.offsetHeight);
        });
        resizeObserver.observe(el);

        connector.update({
          position: Vec2.of(
            (el?.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
            (el?.parentElement?.offsetTop ?? 0) + el.offsetTop,
          ),
          ref: el,
          resizeObserver,
          size: Vec2.of(el.offsetWidth, el.offsetHeight),
        });
      })
    }
    class={props.connector?.css}
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
