import {
  ConnectorSection,
  NodeConnector,
  NodeflowData,
  NodeflowNodeData,
  Vec2,
} from "@nodeflow-lib/core";
import { measureConnector, renderConnector, syncConnector } from "./connector";
import { applyGridSize } from "./grid-sizing";

interface SectionElement {
  el: HTMLDivElement;
  connectors: Map<NodeConnector, HTMLDivElement>;
  observer: MutationObserver;
  /** Last applied section css, so unchanged sections skip DOM writes. */
  css: string;
}

interface NodeElementState {
  /** The core node this element was rendered for. */
  node: NodeflowNodeData;
  observers: Array<ResizeObserver | MutationObserver>;
  sections: Map<ConnectorSection, SectionElement>;
  /** Last applied class list, so unchanged nodes skip DOM writes. */
  className: string;
  frame?: number;
  /** The element returned by the node's `display`, if any. */
  display?: Node;
}

const nodeStates = new WeakMap<HTMLElement, NodeElementState>();
const displayCleanups = new WeakMap<Node, () => void>();

/**
 * Registers a teardown for an element returned by a node's `display`, run
 * when the node is unmounted (deleted, hidden in a collapsed group, scrolled
 * out of view with virtualization on, or its canvas destroyed). Framework
 * wrappers use this to unmount the component they rendered into it.
 */
export const onNodeDisplayUnmount = (
  displayElement: Node,
  cleanup: () => void,
): void => {
  displayCleanups.set(displayElement, cleanup);
};

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

  const state = nodeStates.get(el);
  if (state) {
    state.observers.forEach((observer) => observer.disconnect());
    state.sections.forEach((section) => section.observer.disconnect());
    if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    if (state.display) {
      displayCleanups.get(state.display)?.();
      displayCleanups.delete(state.display);
    }
    nodeStates.delete(el);
  }
  el.remove();
  nodeElements.delete(nodeId);
};

/**
 * Whether `el` was rendered for `node` itself. Core may replace a node with a
 * new object under the same id (e.g. `updateCompositeNode`, or undoing a
 * removal), and the old element's display still points at the old object.
 */
export const isRenderedFor = (
  el: HTMLDivElement,
  node: NodeflowNodeData,
): boolean => nodeStates.get(el)?.node === node;

const measureNode = (nodeDiv: HTMLDivElement, data: NodeflowData, nodeId: string) => {
  applyGridSize(nodeDiv, data);
  data.nodes
    .get(nodeId)
    ?.updateMeasurements(
      Vec2.of(nodeDiv.clientWidth, nodeDiv.clientHeight),
      Vec2.of(nodeDiv.clientLeft, nodeDiv.clientTop),
    );
};

const measureSection = (section: SectionElement) =>
  section.connectors.forEach((el, connector) => measureConnector(el, connector));

const renderSection = (
  nodeDiv: HTMLDivElement,
  section: ConnectorSection,
  node: NodeflowNodeData,
  data: NodeflowData,
  observers: Array<ResizeObserver | MutationObserver>,
): SectionElement => {
  const el = document.createElement("div");
  el.id = `section-${section.id}`;

  const element: SectionElement = {
    el,
    connectors: new Map(),
    // A connector also moves without resizing when a sibling connector is
    // added or removed, so re-measure the whole section then.
    observer: new MutationObserver(() => measureSection(element)),
    css: "\0",
  };
  element.observer.observe(el, { childList: true });

  section.connectors.forEach((connector) => {
    element.connectors.set(
      connector,
      renderConnector(el, connector, node, data, observers),
    );
  });

  nodeDiv.appendChild(el);
  return element;
};

/**
 * Brings a mounted node element up to date with its core node: its css
 * classes (including the selected class), and its connector sections and
 * connectors, which may be added, removed or restyled after mounting.
 */
export const syncNode = (
  nodeDiv: HTMLDivElement,
  node: NodeflowNodeData,
  data: NodeflowData,
): void => {
  const state = nodeStates.get(nodeDiv);
  if (!state) return;

  const selected =
    data.mouseData.hasSelectedNode(node.id) ||
    data.mouseData.selectionBox.selections.isNodeSelected(node.id);
  const className = [
    "nodeflowNode",
    node.css?.normal,
    selected ? node.css?.selected : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  if (className !== state.className) {
    state.className = className;
    nodeDiv.className = className;
  }

  let changed = false;

  state.sections.forEach((element, section) => {
    if (node.connectorSections.get(section.id) === section) return;
    element.observer.disconnect();
    element.el.remove();
    state.sections.delete(section);
    changed = true;
  });

  node.connectorSections.forEach((section) => {
    let element = state.sections.get(section);
    if (!element) {
      element = renderSection(nodeDiv, section, node, data, state.observers);
      state.sections.set(section, element);
      changed = true;
    }

    const css = section.css ?? "";
    if (css !== element.css) {
      element.css = css;
      element.el.className = ["nodeflowConnectorSection", css]
        .filter(Boolean)
        .join(" ");
    }

    element.connectors.forEach((el, connector) => {
      if (section.connectors.get(connector.id) === connector) return;
      el.remove();
      element.connectors.delete(connector);
    });

    section.connectors.forEach((connector) => {
      const existing = element.connectors.get(connector);
      if (existing) {
        syncConnector(existing, connector);
        return;
      }
      element.connectors.set(
        connector,
        renderConnector(element.el, connector, node, data, state.observers),
      );
    });
  });

  // Sections are absolutely positioned, so adding or removing one does not
  // resize the node; re-measure its connectors once the change is laid out.
  if (changed) {
    requestAnimationFrame(() =>
      state.sections.forEach((element) => measureSection(element)),
    );
  }
};

export const renderNode = (
  parent: HTMLElement,
  node: NodeflowNodeData,
  data: NodeflowData,
  nodeElements: Map<string, HTMLDivElement>,
): HTMLDivElement => {
  const nodeDiv = document.createElement("div");
  nodeDiv.id = `node-${node.id}`;
  nodeDiv.dataset.nodeflowNode = node.id;
  nodeDiv.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
  nodeDiv.style.contain = "layout style";
  nodeDiv.style.willChange = "transform";
  // Hidden until the first layout, when centered nodes are moved into place.
  nodeDiv.style.opacity = "0";

  const state: NodeElementState = {
    node,
    observers: [],
    sections: new Map(),
    className: "",
  };
  nodeStates.set(nodeDiv, state);

  const displayResult = node.display({ node });
  if (typeof displayResult === "string") {
    nodeDiv.innerHTML = displayResult;
  } else if (displayResult instanceof Node) {
    state.display = displayResult;
    nodeDiv.appendChild(displayResult);
  }

  syncNode(nodeDiv, node, data);

  const resizeObserver = new ResizeObserver(() => {
    measureNode(nodeDiv, data, node.id);
    // Sections sit at the node's center, so a resize moves every connector.
    state.sections.forEach((element) => measureSection(element));
  });
  resizeObserver.observe(nodeDiv);
  state.observers.push(resizeObserver);

  // Defer the centering adjustment until the first layout is available.
  state.frame = requestAnimationFrame(() => {
    state.frame = undefined;
    const current = data.nodes.get(node.id);
    if (!current) return;

    measureNode(nodeDiv, data, node.id);
    current.applyCenteringOffset(
      Vec2.of(nodeDiv.clientWidth, nodeDiv.clientHeight).divideBy(2),
    );
    nodeDiv.style.transform = `translate(${current.position.x}px, ${current.position.y}px)`;
    nodeDiv.style.opacity = "1";
  });

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
