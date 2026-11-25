import {
  NodeflowCss,
  NodeflowData,
  NodeConnector,
  Vec2,
} from "@nodeflow-lib/core";
import {
  applyLineDash,
  buildCurvePath,
  buildCurvePathD,
  createDebugAnchors,
  createPathElement,
  DebugAnchors,
  removeDebugAnchors,
  updateDebugAnchors,
} from "./curve";
import { isRenderedFor, renderNode, syncNode, unmountNode } from "./node";
import { GroupElement, syncGroups, unmountGroup } from "./group";
import { applyGridSize, gridSizingKey } from "./grid-sizing";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface RenderCanvasOptions {
  /** Extra classes for the canvas and the in-progress connection curve. */
  css?: NodeflowCss;
}

const disposers = new WeakMap<NodeflowData, () => void>();

/**
 * Tears down a canvas rendered by `renderCanvas`: stops its frame loop,
 * disconnects its observers and listeners, and removes its element.
 */
export const disposeCanvas = (data: NodeflowData): void => {
  disposers.get(data)?.();
  disposers.delete(data);
};

interface CurveElement {
  path: SVGPathElement;
  anchors?: DebugAnchors;
  /** Last rendered state, so unchanged curves skip DOM writes. */
  key: string;
}

export const renderCanvas = (
  container: HTMLElement,
  data: NodeflowData,
  nodeElements: Map<string, HTMLDivElement>,
  options: RenderCanvasOptions = {},
): HTMLDivElement => {
  const { css } = options;

  const outerDiv = document.createElement("div");
  outerDiv.id = `nodeflow-${data.id}`;
  outerDiv.tabIndex = 0;
  outerDiv.className = ["nodeflowCanvas", css?.nodeflow]
    .filter(Boolean)
    .join(" ");
  outerDiv.style.overflow = "hidden";
  outerDiv.style.position = "relative";
  outerDiv.style.width = "100%";
  outerDiv.style.height = "100%";
  outerDiv.style.touchAction = "none";
  outerDiv.style.overscrollBehavior = "contain";

  const innerDiv = document.createElement("div");
  innerDiv.style.position = "absolute";
  innerDiv.style.transformOrigin = "center";
  innerDiv.style.transform = `scale(${data.zoomLevel}) translate(${data.position.x}px, ${data.position.y}px)`;
  innerDiv.style.transition = "scale 0.1s ease-out";

  const boundaryDiv = document.createElement("div");
  boundaryDiv.className = "nodeflowBoundary";
  boundaryDiv.style.display = "none";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.position = "absolute";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  const selectionBox = document.createElement("div");
  selectionBox.className = "nodeflowSelectionBox";
  selectionBox.style.display = "none";

  innerDiv.appendChild(boundaryDiv);
  innerDiv.appendChild(svg);
  outerDiv.appendChild(innerDiv);
  outerDiv.appendChild(selectionBox);
  container.appendChild(outerDiv);

  let lastZoom = data.zoomLevel;
  let lastPosX = data.position.x;
  let lastPosY = data.position.y;
  let lastBoundaryKey = "";
  let lastSelectionKey = "";
  let lastGridSizingKey = gridSizingKey(data);
  const curveElements = new Map<string, CurveElement>();
  const groupElements = new Map<string, GroupElement>();
  const heldCurve: { element?: CurveElement } = {};

  const syncBoundary = () => {
    const boundary = data.settings.nodeBoundary;
    if (!boundary) {
      if (lastBoundaryKey !== "") {
        lastBoundaryKey = "";
        boundaryDiv.style.display = "none";
      }
      return;
    }

    const start = boundary.startPosition();
    const end = boundary.endPosition();
    const key = `${start.x}:${start.y}:${end.x}:${end.y}`;
    if (key === lastBoundaryKey) return;

    lastBoundaryKey = key;
    boundaryDiv.style.display = "";
    boundaryDiv.style.left = `${start.x}px`;
    boundaryDiv.style.top = `${start.y}px`;
    boundaryDiv.style.width = `${end.x - start.x}px`;
    boundaryDiv.style.height = `${end.y - start.y}px`;
  };

  // The box is kept in client coordinates; place it inside the canvas.
  const syncSelectionBox = () => {
    const box = data.mouseData.selectionBox.boundingBox;
    if (!box) {
      if (lastSelectionKey !== "") {
        lastSelectionKey = "";
        selectionBox.style.display = "none";
      }
      return;
    }

    const start = box.startPosition();
    const size = box.size.abs();
    const key = `${start.x}:${start.y}:${size.x}:${size.y}`;
    if (key === lastSelectionKey) return;
    lastSelectionKey = key;

    const rect = outerDiv.getBoundingClientRect();
    selectionBox.style.display = "";
    selectionBox.style.left = `${start.x - rect.left - outerDiv.clientLeft}px`;
    selectionBox.style.top = `${start.y - rect.top - outerDiv.clientTop}px`;
    selectionBox.style.width = `${size.x}px`;
    selectionBox.style.height = `${size.y}px`;
  };

  // Mounts nodes that should be in the DOM and unmounts the rest: deleted
  // nodes, nodes hidden in collapsed groups, and with virtualization on,
  // nodes outside the viewport margin.
  const syncNodes = () => {
    const rendered = new Set(data.getRenderedNodeIds());

    nodeElements.forEach((_el, nodeId) => {
      if (!rendered.has(nodeId)) {
        unmountNode(nodeId, nodeElements);
      }
    });

    rendered.forEach((nodeId) => {
      const node = data.nodes.get(nodeId)!;
      const el = nodeElements.get(nodeId);
      if (el && isRenderedFor(el, node)) return;
      // A node replaced under the same id gets a fresh element and display.
      if (el) unmountNode(nodeId, nodeElements);
      renderNode(innerDiv, node, data, nodeElements);
    });
  };

  const syncCurves = () => {
    const activeCurveIds = new Set<string>();
    const debug = data.settings.debugMode;

    data.nodes.forEach((node, nodeId) => {
      node.getAllConnectors().forEach((connector: NodeConnector) => {
        connector.destinations.array.forEach((dest) => {
          const destConnector = dest.destinationConnector;
          const destNodeId = destConnector.parentSection.parentNode.id;
          if (data.isConnectionHidden(nodeId, destNodeId)) return;

          const curveId = makeCurveId(
            nodeId,
            connector.id,
            destNodeId,
            destConnector.id,
          );
          activeCurveIds.add(curveId);

          let element = curveElements.get(curveId);
          if (!element) {
            const path = createPathElement();
            path.setAttribute("id", `curve-${curveId}`);
            path.style.cursor = "pointer";
            path.style.pointerEvents = "visibleStroke";
            // Resolved on each press: undo/redo may replace the connectors.
            const ids = [nodeId, connector.id, destNodeId, destConnector.id];
            path.addEventListener("pointerdown", (event) => {
              const sourceConnector = data.nodes
                .get(ids[0])
                ?.getConnector(ids[1]);
              const destinationConnector = data.nodes
                .get(ids[2])
                ?.getConnector(ids[3]);
              if (!sourceConnector || !destinationConnector) return;
              data.eventStore.onPointerDownInNodeCurve.publish({
                event,
                sourceConnector,
                destinationConnector,
              });
            });
            svg.appendChild(path);
            element = { path, key: "" };
            curveElements.set(curveId, element);
          }

          const curve = buildCurvePath(data, connector, destConnector, dest.shape);
          dest.path = curve;

          const selected = data.mouseData.hasSelectedConnection(
            nodeId,
            connector.id,
            destNodeId,
            destConnector.id,
          );
          const className = [
            dest.css?.normal,
            selected ? dest.css?.selected : undefined,
          ]
            .filter(Boolean)
            .join(" ");

          const key = [
            curve.path,
            dest.dash,
            data.settings.defaultLineDash,
            className,
            debug,
          ].join("|");
          if (key === element.key) return;
          element.key = key;

          element.path.setAttribute("d", curve.path);
          element.path.setAttribute("class", className);
          applyLineDash(element.path, data, dest.dash);

          if (debug) {
            element.anchors ??= createDebugAnchors(svg);
            updateDebugAnchors(
              element.anchors,
              curve.anchorStart,
              curve.anchorEnd,
              dest.css?.normal,
            );
          } else if (element.anchors) {
            removeDebugAnchors(element.anchors);
            element.anchors = undefined;
          }
        });
      });
    });

    curveElements.forEach((element, id) => {
      if (activeCurveIds.has(id)) return;
      element.path.remove();
      removeDebugAnchors(element.anchors);
      curveElements.delete(id);
    });

    syncHeldConnectorCurve();
  };

  const syncHeldConnectorCurve = () => {
    const heldConnector =
      data.mouseData.heldConnectors.length === 1
        ? data.mouseData.heldConnectors[0]
        : undefined;

    if (!heldConnector) {
      if (heldCurve.element) {
        heldCurve.element.path.remove();
        removeDebugAnchors(heldCurve.element.anchors);
        heldCurve.element = undefined;
      }
      return;
    }

    const start = heldConnector.getCenter();
    const end = data.mouseData.globalMousePosition();
    const { anchorStart, anchorEnd, path } =
      data.curveFunctions.createPathForShape(
        data.settings.defaultLineShape,
        start,
        end,
        heldConnector.parentNode.getCenter(),
        end,
      );

    if (!heldCurve.element) {
      const element = createPathElement("#999");
      element.style.pointerEvents = "none";
      svg.appendChild(element);
      heldCurve.element = { path: element, key: "" };
    }

    const { element } = heldCurve;
    const curveCss = css?.getNewCurveCss?.(heldConnector);
    element.path.setAttribute("d", path);
    element.path.setAttribute("class", curveCss ?? "");
    applyLineDash(element.path, data, data.settings.defaultLineDash);

    if (data.settings.debugMode) {
      element.anchors ??= createDebugAnchors(svg);
      updateDebugAnchors(element.anchors, anchorStart, anchorEnd, curveCss);
    } else if (element.anchors) {
      removeDebugAnchors(element.anchors);
      element.anchors = undefined;
    }
  };

  let frame: number | undefined;
  const syncDom = () => {
    if (
      data.zoomLevel !== lastZoom ||
      data.position.x !== lastPosX ||
      data.position.y !== lastPosY
    ) {
      lastZoom = data.zoomLevel;
      lastPosX = data.position.x;
      lastPosY = data.position.y;
      innerDiv.style.transform = `scale(${data.zoomLevel}) translate(${data.position.x}px, ${data.position.y}px)`;
    }

    syncBoundary();

    syncGroups(innerDiv, svg, data, groupElements);
    syncNodes();

    // Newly mounted nodes size themselves on their first resize; re-apply to
    // mounted ones only when the grid sizing settings change.
    const sizingKey = gridSizingKey(data);
    if (sizingKey !== lastGridSizingKey) {
      lastGridSizingKey = sizingKey;
      nodeElements.forEach((el) => applyGridSize(el, data));
    }

    nodeElements.forEach((el, nodeId) => {
      const node = data.nodes.get(nodeId)!;
      el.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
      syncNode(el, node, data);
    });

    syncCurves();
    syncSelectionBox();
    frame = requestAnimationFrame(syncDom);
  };
  frame = requestAnimationFrame(syncDom);

  const measureCanvas = () => {
    data.updateCanvasSize(Vec2.of(outerDiv.clientWidth, outerDiv.clientHeight));
    // Core pairs startPosition with client coordinates, so measure in viewport
    // space (offsetLeft/Top is relative to offsetParent).
    const rect = outerDiv.getBoundingClientRect();
    data.update({ startPosition: Vec2.of(rect.left, rect.top) });
  };
  // Measure now so the first node pass already knows the viewport.
  measureCanvas();
  const resizeObserver = new ResizeObserver(measureCanvas);
  resizeObserver.observe(outerDiv);

  const renderNewNodesKey = "vanilla:render-new-nodes";
  data.eventStore.onNodeDataChanged.subscribe(renderNewNodesKey, syncNodes);

  // Defer initial render so nodes added synchronously after
  // createVanillaNodeflow() are captured in the first pass.
  let disposed = false;
  queueMicrotask(() => {
    if (!disposed) syncNodes();
  });

  outerDiv.addEventListener("mousemove", (event) => {
    data.eventStore.onMouseMoveInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("pointerup", (event) => {
    data.eventStore.onPointerUpInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("wheel", (event) => {
    data.eventStore.onWheelInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("mousedown", (event) => {
    // Keeps middle-button panning from starting the browser's autoscroll.
    if (event.button === 1) {
      event.preventDefault();
    }
    data.eventStore.onMouseDownInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("keydown", (event) => {
    data.eventStore.onKeyDownInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("keyup", (event) => {
    data.eventStore.onKeyUpInNodeflow.publish({ event });
  });
  outerDiv.addEventListener(
    "touchstart",
    (event) => {
      data.eventStore.onTouchStartInNodeflow.publish({ event });
    },
    { passive: false },
  );
  outerDiv.addEventListener(
    "touchmove",
    (event) => {
      data.eventStore.onTouchMoveInNodeflow.publish({ event });
    },
    { passive: false },
  );
  outerDiv.addEventListener("touchend", (event) => {
    if (
      !data.mouseData.pinching &&
      data.mouseData.heldConnectors.length === 1 &&
      event.touches.length === 0
    ) {
      const touch = event.changedTouches[0];
      if (touch) resolveTouchDrop(data, touch);
    }
    data.eventStore.onTouchEndInNodeflow.publish({ event });
  });
  outerDiv.addEventListener("touchcancel", (event) => {
    data.eventStore.onTouchCancelInNodeflow.publish({ event });
  });

  disposers.set(data, () => {
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    data.eventStore.onNodeDataChanged.unsubscribe(renderNewNodesKey);
    Array.from(nodeElements.keys()).forEach((nodeId) =>
      unmountNode(nodeId, nodeElements),
    );
    Array.from(groupElements.keys()).forEach((groupId) =>
      unmountGroup(groupId, groupElements),
    );
    outerDiv.remove();
  });

  return outerDiv;
};

const resolveTouchDrop = (data: NodeflowData, touch: Touch): void => {
  // Core's pointerup handlers stop the event and read its button, so they
  // need a real one. Its pointerType stays empty: core ignores "touch"
  // pointerups, which land on the connector the drag started from.
  const event = new PointerEvent("pointerup", {
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY,
  });
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const connectorEl = target?.closest<HTMLElement>("[data-nodeflow-connector]");
  if (
    connectorEl?.dataset.nodeflowNode &&
    connectorEl.dataset.nodeflowConnector
  ) {
    data.eventStore.onPointerUpInConnector.publish({
      nodeId: connectorEl.dataset.nodeflowNode,
      connectorId: connectorEl.dataset.nodeflowConnector,
      event,
    });
    return;
  }

  const nodeEl = target?.closest<HTMLElement>("[data-nodeflow-node]");
  if (nodeEl?.dataset.nodeflowNode) {
    data.eventStore.onPointerUpInNode.publish({
      nodeId: nodeEl.dataset.nodeflowNode,
      event,
    });
    return;
  }

  data.eventStore.onPointerUpInNodeflow.publish({
    event,
  });
};

const makeCurveId = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destNodeId: string,
  destConnectorId: string,
): string =>
  `${sourceNodeId}-${sourceConnectorId}--${destNodeId}-${destConnectorId}`;

export const renderCurve = (
  svg: SVGElement,
  source: NodeConnector,
  dest: NodeConnector,
  curveId: string,
  data: NodeflowData,
): SVGPathElement => {
  const path = createPathElement();
  path.setAttribute("id", `curve-${curveId}`);
  path.style.cursor = "pointer";
  path.setAttribute("d", buildCurvePathD(data, source, dest));
  applyLineDash(path, data);
  svg.appendChild(path);
  return path;
};

export const renderSelectionBox = (parent: HTMLElement): HTMLDivElement => {
  const selBox = document.createElement("div");
  selBox.className = "nodeflowSelectionBox";
  selBox.style.display = "none";
  parent.appendChild(selBox);
  return selBox;
};
