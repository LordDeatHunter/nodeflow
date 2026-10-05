import {
  NodeConnector,
  NodeflowData,
  LineDash,
  LineShape,
  getLineDashArray,
} from "@nodeflow-lib/core";

export const resolveLineShape = (
  data: NodeflowData,
  shape?: LineShape,
): LineShape => shape ?? data.settings.defaultLineShape;

export const resolveLineDash = (
  data: NodeflowData,
  dash?: LineDash,
): LineDash => dash ?? data.settings.defaultLineDash;

export const buildCurvePathD = (
  data: NodeflowData,
  source: NodeConnector,
  dest: NodeConnector,
  shape?: LineShape,
): string => {
  const start = source.getCenter();
  const end = dest.getCenter();

  return data.curveFunctions.createPathForShape(
    resolveLineShape(data, shape),
    start,
    end,
    source.parentNode.getCenter(),
    dest.parentNode.getCenter(),
  ).path;
};

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

export const renderCurve = (
  svg: SVGElement,
  source: NodeConnector,
  dest: NodeConnector,
  curveId: string,
  data: NodeflowData,
): SVGPathElement => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("id", `curve-${curveId}`);
  path.setAttribute("stroke", "#666");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  path.setAttribute("d", buildCurvePathD(data, source, dest));
  applyLineDash(path, data);

  svg.appendChild(path);
  return path;
};
