import Vec2 from "./data/Vec2";
import { Constants } from "./nodeflow-storage";

/**
 * Create a Bazier curve tailored for horizontal connections
 *
 * @param start - The starting position of the curve
 * @param end - The ending position of the curve
 */
export const getHorizontalCurve = (start: Vec2, end: Vec2): Vec2 =>
  Vec2.of((end.x - start.x) / 1.5, 0);

/**
 * Create a Bazier curve tailored for vertical connections
 *
 * @param start - The starting position of the curve
 * @param end - The ending position of the curve
 */
export const getVerticalCurve = (start: Vec2, end: Vec2): Vec2 =>
  Vec2.of(0, (end.y - start.y) / 1.5);

/**
 * Create a Bazier curve tailored for horizontal connections
 *
 * @param start - The starting position of the curve
 * @param end - The ending position of the curve
 * @param startAnchorPoint - The anchor point at the starting node
 * @param endAnchorPoint - The anchor point at the ending node
 * @returns - The calculated start and end curves
 */
export const getCalculatedCurve = (
  start: Vec2,
  end: Vec2,
  startAnchorPoint: Vec2,
  endAnchorPoint: Vec2,
): { startCurve: Vec2; endCurve: Vec2 } => {
  const startPositionDifference = start.subtract(startAnchorPoint);
  const endPositionDifference = end.subtract(endAnchorPoint);

  const startCurve = startAnchorPoint.add(
    startPositionDifference.multiplyBy(Constants.CURVE_MULTIPLIER),
  );

  const endCurve = endAnchorPoint.add(
    endPositionDifference.multiplyBy(Constants.CURVE_MULTIPLIER),
  );

  return {
    startCurve,
    endCurve,
  };
};

// TODO: Improve this so it doesn't always use the angle from the center, but instead use the general direction of the node
/**
 * Creates an SVG path string for a curve between two nodes
 *
 * @param start - The starting position of the curve
 * @param end - The ending position of the curve
 * @param startAnchorPoint - The anchor point at the starting node
 * @param endAnchorPoint - The anchor point at the ending node
 * @returns - The SVG path string
 */
export const getCurve = (
  start: Vec2,
  end: Vec2,
  startAnchorPoint: Vec2,
  endAnchorPoint: Vec2,
): string => {
  const { startCurve, endCurve } = getCalculatedCurve(
    start,
    end,
    startAnchorPoint,
    endAnchorPoint,
  );

  return `M ${start.x} ${start.y} C ${startCurve.x} ${startCurve.y}, ${endCurve.x} ${endCurve.y}, ${end.x} ${end.y}`;
};

export const createDefaultPathString = (
  start: Vec2,
  end: Vec2,
  xCurve: number,
  yCurve: number,
): string =>
  `M ${start.x} ${start.y} C ${start.x + xCurve} ${start.y + yCurve}, ${
    end.x - xCurve
  } ${end.y - yCurve}, ${end.x} ${end.y}`;

export const createDraggingPathCurve = (
  start: Vec2,
  end: Vec2,
  _startAnchorPoint: Vec2,
  _endAnchorPoint: Vec2,
): string => {
  const { x: xCurve, y: yCurve } = CurveFunctions.getDefaultCurve(start, end);
  return CurveFunctions.createDefaultPathString(start, end, xCurve, yCurve);
};

export const CurveFunctions = {
  createNodePathCurve: getCurve,
  createDraggingPathCurve,
  getDefaultCurve: (_start: Vec2, _end: Vec2) => Vec2.zero(),
  getHorizontalCurve,
  getVerticalCurve,
  createDefaultPathString,
} as const;
export type CurveFunctions = typeof CurveFunctions;

export const SetCurveFunction = <T extends keyof CurveFunctions>(
  name: T,
  value: CurveFunctions[T],
) => {
  CurveFunctions[name] = value;
};
