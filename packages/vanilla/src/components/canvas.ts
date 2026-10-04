import { NodeflowData, NodeConnector, Vec2 } from "@nodeflow/core";
import { renderNode } from "./node";

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

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";

  innerDiv.appendChild(svg);
  outerDiv.appendChild(innerDiv);
  container.appendChild(outerDiv);

  let lastZoom = data.zoomLevel;
  let lastPosX = data.position.x;
  let lastPosY = data.position.y;
  const curveElements = new Map<string, SVGPathElement>();

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

    data.nodes.forEach((node, nodeId) => {
      if (!nodeElements.has(nodeId)) {
        renderNode(innerDiv, node, data, nodeElements);
      }
    });

    nodeElements.forEach((el, nodeId) => {
      const node = data.nodes.get(nodeId);
      if (node) {
        el.style.left = `${node.position.x}px`;
        el.style.top = `${node.position.y}px`;
      }
    });

    syncCurves(data, svg, curveElements);
    requestAnimationFrame(syncDom);
  };
  requestAnimationFrame(syncDom);

  const resizeObserver = new ResizeObserver(() => {
    data.updateCanvasSize(Vec2.of(outerDiv.clientWidth, outerDiv.clientHeight));
    data.update({
      startPosition: Vec2.of(outerDiv.offsetLeft, outerDiv.offsetTop),
    });
  });
  resizeObserver.observe(outerDiv);

  data.eventStore.onNodeDataChanged.subscribeMultiple([
    {
      name: "vanilla:render-new-nodes",
      event: ({ nodeId }: { nodeId: string; data: unknown }) => {
        if (!nodeElements.has(nodeId)) {
          const node = data.nodes.get(nodeId);
          if (node) {
            renderNode(innerDiv, node, data, nodeElements);
          }
        }
      },
    },
  ]);

  // Defer initial render so nodes added synchronously after
  // createVanillaNodeflow() are captured in the first pass.
  queueMicrotask(() => {
    data.nodes.forEach((node) => {
      if (!nodeElements.has(node.id)) {
        renderNode(innerDiv, node, data, nodeElements);
      }
    });
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

const computePathD = (source: NodeConnector, dest: NodeConnector): string => {
  const start = source.getCenter();
  const end = dest.getCenter();
  const anchorOffset = Vec2.of((end.x - start.x) / 1.5, 0);
  const a1 = start.add(anchorOffset);
  const a2 = end.subtract(anchorOffset);
  return `M ${start.x} ${start.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${end.x} ${end.y}`;
};

const createCurvePath = (
  svg: SVGElement,
  sourceConnector: NodeConnector,
  destConnector: NodeConnector,
  curveId: string,
  cssClass?: string,
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
  path.setAttribute("d", computePathD(sourceConnector, destConnector));
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

    const anchorOffset = Vec2.of((end.x - start.x) / 1.5, 0);
    const a1 = start.add(anchorOffset);
    const a2 = end.subtract(anchorOffset);
    const pathD = `M ${start.x} ${start.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${end.x} ${end.y}`;

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
              dest.css?.normal,
            ),
          );
        } else {
          curveElements
            .get(curveId)!
            .setAttribute(
              "d",
              computePathD(connector, dest.destinationConnector),
            );
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
  _data: NodeflowData,
): SVGPathElement => {
  return createCurvePath(svg, source, dest, curveId, undefined);
};

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
