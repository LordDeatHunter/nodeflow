import Vec2 from "./data/Vec2";
import { Constants } from "./nodeflow-storage";

export const getHorizontalCurve = (start: Vec2, end: Vec2): Vec2 =>
  Vec2.of((end.x - start.x) / 1.5, 0);

export const getVerticalCurve = (start: Vec2, end: Vec2): Vec2 =>
  Vec2.of(0, (end.y - start.y) / 1.5);

export const getCalculatedCurve = (
  start: Vec2,
  end: Vec2,
  startCenterOfMass: Vec2,
  endCenterOfMass: Vec2,
): { startCurve: Vec2; endCurve: Vec2 } => {
  const startPositionDifference = start.subtract(startCenterOfMass);
  const endPositionDifference = end.subtract(endCenterOfMass);

  const startCurve = startCenterOfMass.add(
    startPositionDifference.multiplyBy(Constants.CURVE_MULTIPLIER),
  );

  const endCurve = endCenterOfMass.add(
    endPositionDifference.multiplyBy(Constants.CURVE_MULTIPLIER),
  );

  return {
    startCurve,
    endCurve,
  };
};

// TODO: Improve this so it doesn't always use the angle from the center, but instead use the general direction of the node
export const getCurve = (
  start: Vec2,
  end: Vec2,
  startCenterOfMass: Vec2,
  endCenterOfMass: Vec2,
): string => {
  const { startCurve, endCurve } = getCalculatedCurve(
    start,
    end,
    startCenterOfMass,
    endCenterOfMass,
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
  _startCenterOfMass: Vec2,
  _endCenterOfMass: Vec2,
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
