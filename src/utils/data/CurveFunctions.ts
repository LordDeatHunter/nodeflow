import Vec2 from "./Vec2";
import { NodeflowData } from "./index";

export default class CurveFunctions {
  private readonly nodeflowData;

  public constructor(nodeflowData: NodeflowData) {
    this.nodeflowData = nodeflowData;
  }

  /**
   * Create a Bazier curve tailored for horizontal connections
   *
   * @param start - The starting position of the curve
   * @param end - The ending position of the curve
   */
  public getHorizontalCurve = (start: Vec2, end: Vec2): Vec2 =>
    Vec2.of((end.x - start.x) / 1.5, 0);

  /**
   * Create a Bazier curve tailored for vertical connections
   *
   * @param start - The starting position of the curve
   * @param end - The ending position of the curve
   */
  public getVerticalCurve = (start: Vec2, end: Vec2): Vec2 =>
    Vec2.of(0, (end.y - start.y) / 1.5);

  /**
   * Create a Bazier curve tailored for horizontal connections
   *
   * @param start - The starting position of the curve
   * @param end - The end position of the curve
   * @param startAnchorPoint - The center of the starting node
   * @param endAnchorPoint - The center of end node
   * @returns - The calculated start and end curves
   */
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
