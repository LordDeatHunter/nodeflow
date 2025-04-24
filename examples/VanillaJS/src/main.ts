import "./style.css";
import {
  CurveFunctions,
  NodeflowData,
  NodeflowLib,
  Vec2,
  getWindowSize,
  onWindowResize,
} from "nodeflow-lib";
import { setupDummyConnections, setupDummyNodes } from "./utils.ts";

const updateDivSize = (div: HTMLDivElement) => {
  const windowSize = getWindowSize();
  div.style.width = `${windowSize.x}px`;
  div.style.height = `${windowSize.y}px`;
};

export class FTCurveFunctions extends CurveFunctions {
  public calculateCurveAnchors(
    start: Vec2,
    end: Vec2,
    _startNodeCenter: Vec2,
    _endNodeCenter: Vec2,
  ) {
    const v = this.getVerticalCurve(start, end);
    const anchorStart = start.add(v);
    const anchorEnd = end.subtract(v);

    return { anchorStart, anchorEnd };
  }
}

const [nodeflowData, nodeflow] = NodeflowLib.get().createCanvas(
  "main",
  {},
  (nf: NodeflowData) => new FTCurveFunctions(nf),
);

const div = document.querySelector<HTMLDivElement>("#app")!;
div.appendChild(nodeflow({ height: "100%", width: "100%" }));
onWindowResize(() => updateDivSize(div));
updateDivSize(div);

window.addEventListener("load", () => {
  setupDummyNodes();
  setupDummyConnections();
});

export { nodeflowData };
