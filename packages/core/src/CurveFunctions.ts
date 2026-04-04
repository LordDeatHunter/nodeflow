import Vec2 from "./Vec2";

export default class CurveFunctions {
  private readonly nodeflowData: any;

  public constructor(nodeflowData: any) {
    this.nodeflowData = nodeflowData;
  }

  public getHorizontalCurve = (start: Vec2, end: Vec2): Vec2 =>
    Vec2.of((end.x - start.x) / 1.5, 0);

  public getVerticalCurve = (start: Vec2, end: Vec2): Vec2 =>
    Vec2.of(0, (end.y - start.y) / 1.5);

  public calculateCurveAnchors(
    start: Vec2,
    end: Vec2,
    startAnchorPoint: Vec2,
    endAnchorPoint: Vec2,
  ): { anchorStart: Vec2; anchorEnd: Vec2 } {
    const anchorMagnitude = start.distanceTo(end) / 300;

    const anchorStart = startAnchorPoint.add(
      start.subtract(startAnchorPoint).multiplyBy(anchorMagnitude),
    );
    const anchorEnd = endAnchorPoint.add(
      end.subtract(endAnchorPoint).multiplyBy(anchorMagnitude),
    );

    return { anchorStart, anchorEnd };
  }

  public createDefaultCurvePath = (
    start: Vec2,
    end: Vec2,
    startAnchorPoint: Vec2,
    endAnchorPoint: Vec2,
  ): string =>
    `M ${start.x} ${start.y} C ${startAnchorPoint.x} ${startAnchorPoint.y}, ${endAnchorPoint.x} ${endAnchorPoint.y}, ${end.x} ${end.y}`;
}
