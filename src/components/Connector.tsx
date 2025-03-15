import Vec2 from "../utils/data/Vec2";
import { NodeflowData } from "../utils";
import NodeConnector from "../utils/data/NodeConnector";

interface ConnectorProps {
  connector: NodeConnector;
  connectorId: string;
  nodeId: string;
  sectionId: string;
  nodeflowData: NodeflowData;
}

const createConnector = (props: ConnectorProps) => {
  const div = document.createElement("div");
  div.classList.add(props.connector.css);
  div.id = `connector-${props.connectorId}`;

  setTimeout(() => {
    if (!div || !props.nodeflowData.nodes.has(props.nodeId)) return;

    const connector = props.nodeflowData.nodes
      .get(props.nodeId)!
      .connectorSections.get(props.sectionId)!
      .connectors.get(props.connectorId)!;

    const resizeObserver = new ResizeObserver(() => {
      connector.size = Vec2.of(div.offsetWidth, div.offsetHeight);
    });
    resizeObserver.observe(div);

    connector.update({
      position: Vec2.of(
        (div?.parentElement?.offsetLeft ?? 0) + div.offsetLeft,
        (div?.parentElement?.offsetTop ?? 0) + div.offsetTop,
      ),
      resizeObserver,
      size: Vec2.of(div.offsetWidth, div.offsetHeight),
    });
  });

  div.addEventListener("mousedown", (event) =>
    props.nodeflowData.eventStore.onMouseDownInConnector.publish({
      event,
      nodeId: props.nodeId,
      connectorId: props.connectorId,
    }),
  );

  div.addEventListener("touchstart", (event) =>
    props.nodeflowData.eventStore.onTouchStartInConnector.publish({
      event,
      nodeId: props.nodeId,
      connectorId: props.connectorId,
    }),
  );

  div.addEventListener("pointerup", (event) =>
    props.nodeflowData.eventStore.onPointerUpInConnector.publish({
      event,
      nodeId: props.nodeId,
      connectorId: props.connectorId,
    }),
  );

  return div;
};

export default createConnector;
