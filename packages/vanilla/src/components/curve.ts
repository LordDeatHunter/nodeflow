import { NodeConnector, NodeflowData } from "@nodeflow/core";

export function renderCurve(
  svg: SVGElement,
  source: NodeConnector,
  dest: NodeConnector,
  curveId: string,
  _data: NodeflowData,
): SVGPathElement {
  const start = source.getCenter();
  const end = dest.getCenter();
  const anchorOffset = { x: (end.x - start.x) / 1.5, y: 0 };
  const a1 = { x: start.x + anchorOffset.x, y: start.y + anchorOffset.y };
  const a2 = { x: end.x - anchorOffset.x, y: end.y - anchorOffset.y };

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("id", `curve-${curveId}`);
  path.setAttribute("stroke", "#666");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  path.setAttribute(
    "d",
    `M ${start.x} ${start.y} C ${a1.x} ${a1.y}, ${a2.x} ${a2.y}, ${end.x} ${end.y}`,
  );

  svg.appendChild(path);
  return path;
}
