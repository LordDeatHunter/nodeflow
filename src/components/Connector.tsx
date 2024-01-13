import { nodes } from "../utils";
import { Vec2 } from "../utils/vec2";
import { drawflowEventStore } from "../utils/events";
import { Component } from "solid-js";
import NodeConnector from "../utils/NodeConnector";

interface ConnectorProps {
  connector: NodeConnector;
  connectorId: string;
  nodeId: string;
  sectionId: string;
}

const Connector: Component<ConnectorProps> = (props) => (
  <div
    ref={(el) =>
      setTimeout(() => {
        if (!el) return;

        const connector = nodes
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
      drawflowEventStore.onMouseDownInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
    onTouchStart={(event) =>
      drawflowEventStore.onTouchStartInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
    onPointerUp={(event) =>
      drawflowEventStore.onPointerUpInConnector.publish({
        event,
        nodeId: props.nodeId,
        connectorId: props.connectorId,
      })
    }
  />
);

export default Connector;
