import { NodeflowData, NodeflowNodeData, Vec2 } from "@nodeflow-lib/core";
import { renderConnector } from "./connector";
import { applyGridSize } from "./grid-sizing";

const nodeObservers = new WeakMap<HTMLElement, ResizeObserver[]>();

/**
 * Detaches a node element rendered by `renderNode`. Its observers are
 * disconnected first: a detached element measures 0x0, which would otherwise
 * overwrite the node's size in core while it is merely scrolled out of view.
 */
export const unmountNode = (
  nodeId: string,
  nodeElements: Map<string, HTMLDivElement>,
): void => {
  const el = nodeElements.get(nodeId);
  if (!el) return;

  nodeObservers.get(el)?.forEach((observer) => observer.disconnect());
  nodeObservers.delete(el);
  el.remove();
  nodeElements.delete(nodeId);
};

export const renderNode = (
  parent: HTMLElement,
  node: NodeflowNodeData,
  data: NodeflowData,
  nodeElements: Map<string, HTMLDivElement>,
): HTMLDivElement => {
  const nodeDiv = document.createElement("div");
  nodeDiv.id = `node-${node.id}`;
  nodeDiv.className = "nodeflowNode";
  nodeDiv.dataset.nodeflowNode = node.id;
  nodeDiv.style.position = "absolute";
  nodeDiv.style.left = `${node.position.x}px`;
  nodeDiv.style.top = `${node.position.y}px`;
  nodeDiv.style.cursor = "grab";
  nodeDiv.style.userSelect = "none";
  nodeDiv.style.boxSizing = "border-box";

  const observers: ResizeObserver[] = [];
  nodeObservers.set(nodeDiv, observers);

  if (node.css?.normal) {
    nodeDiv.classList.add(node.css.normal);
  }

  const displayResult = node.display({ node });
  if (typeof displayResult === "string") {
    nodeDiv.innerHTML = displayResult;
  } else if (displayResult instanceof HTMLElement) {
    nodeDiv.appendChild(displayResult);
  }

  node.connectorSections.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.id = `section-${section.id}`;
    sectionDiv.className = "nodeflowConnectorSection";
    sectionDiv.style.position = "absolute";
    sectionDiv.style.display = "flex";
    sectionDiv.style.justifyContent = "space-evenly";
    sectionDiv.style.width = "0";
    sectionDiv.style.height = "0";
    sectionDiv.style.top = "50%";
    sectionDiv.style.left = "50%";
    if (section.css) {
      sectionDiv.classList.add(section.css);
    }

    section.connectors.forEach((connector) => {
      renderConnector(sectionDiv, connector, node, data, observers);
    });

    nodeDiv.appendChild(sectionDiv);
  });

  const resizeObserver = new ResizeObserver(() => {
    applyGridSize(nodeDiv, data);
    node.updateMeasurements(
      Vec2.of(nodeDiv.clientWidth, nodeDiv.clientHeight),
      Vec2.of(nodeDiv.clientLeft, nodeDiv.clientTop),
    );

    const nodeRect = nodeDiv.getBoundingClientRect();
    node.connectorSections.forEach((section) => {
      section.connectors.forEach((connector) => {
        const connectorEl = nodeDiv.querySelector<HTMLElement>(
          `#connector-${CSS.escape(connector.id)}`,
        );
        if (!connectorEl) return;
        const rect = connectorEl.getBoundingClientRect();
        connector.updateMeasurements(
          Vec2.of(rect.left - nodeRect.left, rect.top - nodeRect.top),
          Vec2.of(rect.width, rect.height),
        );
      });
    });
  });
  resizeObserver.observe(nodeDiv);
  observers.push(resizeObserver);

  nodeDiv.addEventListener("mousedown", (event) => {
    data.eventStore.onMouseDownInNode.publish({ event, nodeId: node.id });
  });

  nodeDiv.addEventListener("touchstart", (event) => {
    data.eventStore.onTouchStartInNode.publish({ event, nodeId: node.id });
  });

  nodeDiv.addEventListener("pointerup", (event) => {
    data.eventStore.onPointerUpInNode.publish({ event, nodeId: node.id });
  });

  parent.appendChild(nodeDiv);
  nodeElements.set(node.id, nodeDiv);

  return nodeDiv;
};
