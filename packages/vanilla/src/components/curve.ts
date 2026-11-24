import {
  NodeConnector,
  NodeflowData,
  LineDash,
  LineShape,
  Vec2,
  getLineDashArray,
} from "@nodeflow-lib/core";

const SVG_NS = "http://www.w3.org/2000/svg";

export const resolveLineShape = (
  data: NodeflowData,
  shape?: LineShape,
): LineShape => shape ?? data.settings.defaultLineShape;

export const resolveLineDash = (
  data: NodeflowData,
  dash?: LineDash,
): LineDash => dash ?? data.settings.defaultLineDash;

export interface CurvePathData {
  start: Vec2;
  end: Vec2;
  anchorStart: Vec2;
  anchorEnd: Vec2;
  path: string;
}

export const buildCurvePath = (
  data: NodeflowData,
  source: NodeConnector,
  dest: NodeConnector,
  shape?: LineShape,
): CurvePathData => {
  // Ends hidden in a collapsed group attach to the group's box.
  const { start, end, startAnchor, endAnchor } = data.getConnectionEndpoints(
    source,
    dest,
  );

  const { anchorStart, anchorEnd, path } =
    data.curveFunctions.createPathForShape(
      resolveLineShape(data, shape),
      start,
      end,
      startAnchor,
      endAnchor,
    );

  return { start, end, anchorStart, anchorEnd, path };
};

export const buildCurvePathD = (
  data: NodeflowData,
  source: NodeConnector,
  dest: NodeConnector,
  shape?: LineShape,
): string => buildCurvePath(data, source, dest, shape).path;

export const applyLineDash = (
  path: SVGPathElement,
  data: NodeflowData,
  dash?: LineDash,
): void => {
  const dashArray = getLineDashArray(resolveLineDash(data, dash));

  if (dashArray) {
    path.setAttribute("stroke-dasharray", dashArray);
  } else {
    path.removeAttribute("stroke-dasharray");
  }
};

/**
 * Creates a curve path. The stroke is a presentation attribute, so any CSS
 * class (e.g. from a connection's css) overrides it.
 */
export const createPathElement = (stroke = "#666"): SVGPathElement => {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  return path;
};

/** A pair of circles marking a curve's anchors in `settings.debugMode`. */
export interface DebugAnchors {
  start: SVGCircleElement;
  end: SVGCircleElement;
}

export const createDebugAnchors = (svg: SVGElement): DebugAnchors => {
  const make = () => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "none");
    svg.appendChild(circle);
    return circle;
  };
  return { start: make(), end: make() };
};

export const updateDebugAnchors = (
  anchors: DebugAnchors,
  anchorStart: Vec2 | undefined,
  anchorEnd: Vec2 | undefined,
  css: string | undefined,
): void => {
  const apply = (circle: SVGCircleElement, at: Vec2 | undefined) => {
    circle.setAttribute("cx", String(at?.x ?? 0));
    circle.setAttribute("cy", String(at?.y ?? 0));
    circle.setAttribute("class", css ?? "");
  };
  apply(anchors.start, anchorStart);
  apply(anchors.end, anchorEnd);
};

export const removeDebugAnchors = (anchors: DebugAnchors | undefined): void => {
  anchors?.start.remove();
  anchors?.end.remove();
};

export const renderCurve = (
  svg: SVGElement,
  source: NodeConnector,
  dest: NodeConnector,
  curveId: string,
  data: NodeflowData,
): SVGPathElement => {
  const path = createPathElement();
  path.setAttribute("id", `curve-${curveId}`);
  path.setAttribute("d", buildCurvePathD(data, source, dest));
  applyLineDash(path, data);

  svg.appendChild(path);
  return path;
};
