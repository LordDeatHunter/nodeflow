import {
  NodeflowData,
  NodeflowNodeData,
  NodeConnector,
  Vec2,
} from "@nodeflow/core";

export function renderConnector(
  parent: HTMLElement,
  connector: NodeConnector,
  node: NodeflowNodeData,
  data: NodeflowData,
): HTMLDivElement {
  const connectorDiv = document.createElement("div");
  connectorDiv.id = `connector-${connector.id}`;
  if (connector.css) {
    connectorDiv.className = connector.css;
  }
  connectorDiv.style.cursor = "crosshair";
  connectorDiv.style.display = "inline-block";

  const resizeObserver = new ResizeObserver(() => {
    const rect = connectorDiv.getBoundingClientRect();
    const nodeEl = document.getElementById(`node-${node.id}`);
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    const position = Vec2.of(
      rect.left - nodeRect.left + node.offset.x,
      rect.top - nodeRect.top + node.offset.y,
    );
    connector.updateMeasurements(position, Vec2.of(rect.width, rect.height));
  });
  resizeObserver.observe(connectorDiv);

  connectorDiv.addEventListener("mousedown", (event) => {
    data.eventStore.onMouseDownInConnector.publish({
      event,
      nodeId: node.id,
      connectorId: connector.id,
    });
  });

  connectorDiv.addEventListener("touchstart", (event) => {
    data.eventStore.onTouchStartInConnector.publish({
      event,
      nodeId: node.id,
      connectorId: connector.id,
    });
  });

  connectorDiv.addEventListener("pointerup", (event) => {
    data.eventStore.onPointerUpInConnector.publish({
      event,
      nodeId: node.id,
      connectorId: connector.id,
    });
  });

  parent.appendChild(connectorDiv);
  return connectorDiv;
}
