import { CurveFunctions, Vec2 } from "nodeflow-lib";

export class BPCurveFunctions extends CurveFunctions {
  public calculateCurveAnchors(
    start: Vec2,
    end: Vec2,
    _startNodeCenter: Vec2,
    _endNodeCenter: Vec2,
  ) {
    const offset = this.getHorizontalCurve(start, end);
    const anchorStart = start.add(offset);
    const anchorEnd = end.subtract(offset);

    return { anchorStart, anchorEnd };
  }
}
