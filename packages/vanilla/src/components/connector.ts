import {
  NodeflowData,
  NodeflowNodeData,
  NodeConnector,
  Vec2,
} from "@nodeflow-lib/core";

/**
 * Stores a connector element's position inside its node's padding box. Uses
 * offsets rather than client rects so the result does not depend on zoom.
 */
export const measureConnector = (
  el: HTMLElement,
  connector: NodeConnector,
): void => {
  if (!el.isConnected) return;

  connector.updateMeasurements(
    Vec2.of(
      (el.parentElement?.offsetLeft ?? 0) + el.offsetLeft,
      (el.parentElement?.offsetTop ?? 0) + el.offsetTop,
    ),
    Vec2.of(el.offsetWidth, el.offsetHeight),
  );
};

/** Applies the connector's current css class to its element. */
export const syncConnector = (
  el: HTMLDivElement,
  connector: NodeConnector,
): void => {
  const css = connector.css ?? "";
  if (el.className !== css) el.className = css;
};

export const renderConnector = (
  parent: HTMLElement,
  connector: NodeConnector,
  node: NodeflowNodeData,
  data: NodeflowData,
  observers: Array<ResizeObserver | MutationObserver> = [],
): HTMLDivElement => {
  const connectorDiv = document.createElement("div");
  connectorDiv.id = `connector-${connector.id}`;
  connectorDiv.dataset.nodeflowConnector = connector.id;
  connectorDiv.dataset.nodeflowNode = node.id;
  syncConnector(connectorDiv, connector);

  const resizeObserver = new ResizeObserver(() =>
    measureConnector(connectorDiv, connector),
  );
  resizeObserver.observe(connectorDiv);
  observers.push(resizeObserver);

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
};
