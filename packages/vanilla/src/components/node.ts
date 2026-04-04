import { NodeflowData, NodeflowNodeData, Vec2 } from "@nodeflow/core";
import { renderConnector } from "./connector";

export function renderNode(
  parent: HTMLElement,
  node: NodeflowNodeData,
  data: NodeflowData,
  nodeElements: Map<string, HTMLDivElement>,
): HTMLDivElement {
  const nodeDiv = document.createElement("div");
  nodeDiv.id = `node-${node.id}`;
  nodeDiv.className = "nodeflowNode";
  nodeDiv.style.position = "absolute";
  nodeDiv.style.left = `${node.position.x}px`;
  nodeDiv.style.top = `${node.position.y}px`;
  nodeDiv.style.cursor = "grab";
  nodeDiv.style.userSelect = "none";
  nodeDiv.style.boxSizing = "border-box";

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
      renderConnector(sectionDiv, connector, node, data);
    });

    nodeDiv.appendChild(sectionDiv);
  });

  const resizeObserver = new ResizeObserver(() => {
    node.updateMeasurements(
      Vec2.of(nodeDiv.clientWidth, nodeDiv.clientHeight),
      Vec2.of(nodeDiv.clientLeft, nodeDiv.clientTop),
    );
  });
  resizeObserver.observe(nodeDiv);

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
}
