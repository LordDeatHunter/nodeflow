import {
  NodeflowData,
  NodeConnector,
  Vec2,
  LineDash,
  LineShape,
} from "@nodeflow-lib/core";
import { applyLineDash, buildCurvePathD } from "./curve";
import { renderNode, unmountNode } from "./node";
import { GroupElement, syncGroups } from "./group";
import { applyGridSize, gridSizingKey } from "./grid-sizing";

export const renderCanvas = (
  container: HTMLElement,
  data: NodeflowData,
  nodeElements: Map<string, HTMLDivElement>,
): HTMLDivElement => {
  const outerDiv = document.createElement("div");
  outerDiv.id = `nodeflow-${data.id}`;
  outerDiv.tabIndex = 0;
  outerDiv.className = "nodeflowCanvas";
  outerDiv.style.overflow = "hidden";
  outerDiv.style.position = "relative";
  outerDiv.style.width = "100%";
  outerDiv.style.height = "100%";
  outerDiv.style.touchAction = "none";
  outerDiv.style.overscrollBehavior = "contain";
  outerDiv.style.setProperty("-webkit-tap-highlight-color", "transparent");
  outerDiv.style.setProperty("-webkit-touch-callout", "none");

  const innerDiv = document.createElement("div");
  innerDiv.style.position = "absolute";
  innerDiv.style.transformOrigin = "center";
  innerDiv.style.transform = `scale(${data.zoomLevel}) translate(${data.position.x}px, ${data.position.y}px)`;
  innerDiv.style.transition = "scale 0.1s ease-out";

  const boundaryDiv = document.createElement("div");
  boundaryDiv.className = "nodeflowBoundary";
  boundaryDiv.style.position = "absolute";
  boundaryDiv.style.boxSizing = "border-box";
  boundaryDiv.style.pointerEvents = "none";
  boundaryDiv.style.display = "none";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  innerDiv.appendChild(boundaryDiv);
  innerDiv.appendChild(svg);
  outerDiv.appendChild(innerDiv);
  container.appendChild(outerDiv);

  let lastZoom = data.zoomLevel;
  let lastPosX = data.position.x;
  let lastPosY = data.position.y;
  let lastBoundaryKey = "";
  let lastGridSizingKey = gridSizingKey(data);
  const curveElements = new Map<string, SVGPathElement>();
  const groupElements = new Map<string, GroupElement>();

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
      if (!nodeElements.has(nodeId)) {
        renderNode(innerDiv, data.nodes.get(nodeId)!, data, nodeElements);
      }
    });
  };

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
      el.style.left = `${node.position.x}px`;
      el.style.top = `${node.position.y}px`;
    });

    syncCurves(data, svg, curveElements);
    requestAnimationFrame(syncDom);
  };
  requestAnimationFrame(syncDom);

  const measureCanvas = () => {
    data.updateCanvasSize(Vec2.of(outerDiv.clientWidth, outerDiv.clientHeight));
    data.update({
      startPosition: Vec2.of(outerDiv.offsetLeft, outerDiv.offsetTop),
    });
  };
  // Measure now so the first node pass already knows the viewport.
  measureCanvas();
  const resizeObserver = new ResizeObserver(measureCanvas);
  resizeObserver.observe(outerDiv);

  data.eventStore.onNodeDataChanged.subscribeMultiple([
    {
      name: "vanilla:render-new-nodes",
      event: () => syncNodes(),
    },
  ]);

  // Defer initial render so nodes added synchronously after
  // createVanillaNodeflow() are captured in the first pass.
  queueMicrotask(syncNodes);

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
  outerDiv.addEventListener("touchstart", (event) => {
    data.eventStore.onTouchStartInNodeflow.publish({ event });
  }, { passive: false });
  outerDiv.addEventListener("touchmove", (event) => {
    data.eventStore.onTouchMoveInNodeflow.publish({ event });
  }, { passive: false });
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

  return outerDiv;
};

const resolveTouchDrop = (data: NodeflowData, touch: Touch): void => {
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const connectorEl = target?.closest<HTMLElement>("[data-nodeflow-connector]");
  if (
    connectorEl?.dataset.nodeflowNode &&
    connectorEl.dataset.nodeflowConnector
  ) {
    data.eventStore.onPointerUpInConnector.publish({
      nodeId: connectorEl.dataset.nodeflowNode,
      connectorId: connectorEl.dataset.nodeflowConnector,
      event: touch as unknown as PointerEvent,
    });
    return;
  }

  const nodeEl = target?.closest<HTMLElement>("[data-nodeflow-node]");
  if (nodeEl?.dataset.nodeflowNode) {
    data.eventStore.onPointerUpInNode.publish({
      nodeId: nodeEl.dataset.nodeflowNode,
      event: touch as unknown as PointerEvent,
    });
    return;
  }

  data.eventStore.onPointerUpInNodeflow.publish({
    event: touch as unknown as PointerEvent,
  });
};

const makeCurveId = (
  sourceNodeId: string,
  sourceConnectorId: string,
  destNodeId: string,
  destConnectorId: string,
): string => {
  return `${sourceNodeId}-${sourceConnectorId}--${destNodeId}-${destConnectorId}`;
};

const createCurvePath = (
  svg: SVGElement,
  sourceConnector: NodeConnector,
  destConnector: NodeConnector,
  curveId: string,
  data: NodeflowData,
  cssClass?: string,
  shape?: LineShape,
  dash?: LineDash,
): SVGPathElement => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("id", `curve-${curveId}`);
  path.setAttribute("stroke", "#666");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  path.style.cursor = "pointer";
  if (cssClass) {
    path.setAttribute("class", cssClass);
  }
  path.setAttribute(
    "d",
    buildCurvePathD(data, sourceConnector, destConnector, shape),
  );
  applyLineDash(path, data, dash);
  svg.appendChild(path);
  return path;
};

const syncHeldConnectorCurve = (
  data: NodeflowData,
  svg: SVGElement,
  curveElements: Map<string, SVGPathElement>,
): void => {
  const heldId = "__held__";

  if (data.mouseData.heldConnectors.length === 1) {
    const heldConnector = data.mouseData.heldConnectors[0];
    if (!heldConnector) return;

    const start = heldConnector.getCenter();
    const end = data.mouseData.mousePosition
      .subtract(data.startPosition)
      .divideBy(data.zoomLevel)
      .subtract(data.position);

    const { path: pathD } = data.curveFunctions.createPathForShape(
      data.settings.defaultLineShape,
      start,
      end,
      heldConnector.parentNode.getCenter(),
      end,
    );

    let path = curveElements.get(heldId);
    if (!path) {
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("stroke", "#999");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
      path.style.pointerEvents = "none";
      svg.appendChild(path);
      curveElements.set(heldId, path);
    }
    path.setAttribute("d", pathD);
    applyLineDash(path, data, data.settings.defaultLineDash);
  } else {
    const path = curveElements.get(heldId);
    if (path) {
      svg.removeChild(path);
      curveElements.delete(heldId);
    }
  }
};

const syncCurves = (
  data: NodeflowData,
  svg: SVGElement,
  curveElements: Map<string, SVGPathElement>,
): void => {
  const activeCurveIds = new Set<string>();

  data.nodes.forEach((node, nodeId) => {
    node.getAllConnectors().forEach((connector: NodeConnector) => {
      connector.destinations.array.forEach((dest) => {
        const destNodeId =
          dest.destinationConnector.parentSection.parentNode.id;
        if (data.isConnectionHidden(nodeId, destNodeId)) return;
        const destConnectorId = dest.destinationConnector.id;
        const curveId = makeCurveId(
          nodeId,
          connector.id,
          destNodeId,
          destConnectorId,
        );
        activeCurveIds.add(curveId);

        if (!curveElements.has(curveId)) {
          curveElements.set(
            curveId,
            createCurvePath(
              svg,
              connector,
              dest.destinationConnector,
              curveId,
              data,
              dest.css?.normal,
              dest.shape,
              dest.dash,
            ),
          );
        } else {
          const path = curveElements.get(curveId)!;
          path.setAttribute(
            "d",
            buildCurvePathD(data, connector, dest.destinationConnector, dest.shape),
          );
          applyLineDash(path, data, dest.dash);
        }
      });
    });
  });

  curveElements.forEach((el, id) => {
    if (!activeCurveIds.has(id) && id !== "__held__") {
      svg.removeChild(el);
      curveElements.delete(id);
    }
  });

  syncHeldConnectorCurve(data, svg, curveElements);
};

export const renderCurve = (
  svg: SVGElement,
  source: NodeConnector,
  dest: NodeConnector,
  curveId: string,
  data: NodeflowData,
): SVGPathElement => createCurvePath(svg, source, dest, curveId, data);

export const renderSelectionBox = (parent: HTMLElement): HTMLDivElement => {
  const selBox = document.createElement("div");
  selBox.className = "nodeflowSelectionBox";
  selBox.style.position = "absolute";
  selBox.style.border = "1px dashed #0078d4";
  selBox.style.backgroundColor = "rgba(0, 120, 212, 0.1)";
  selBox.style.pointerEvents = "none";
  selBox.style.display = "none";
  parent.appendChild(selBox);
  return selBox;
};
