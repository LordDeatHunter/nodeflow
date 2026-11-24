import Vec2 from "./Vec2";
import {
  BuiltInLineShape,
  LineDash,
  LineShape,
} from "./nodeflow-types";

export interface LineShapeContext {
  start: Vec2;
  end: Vec2;
  anchorStart: Vec2;
  anchorEnd: Vec2;
  startNodeCenter: Vec2;
  endNodeCenter: Vec2;
}

export type LineShapeGenerator = (context: LineShapeContext) => string;

const cubicCurvePath = ({
  start,
  end,
  anchorStart,
  anchorEnd,
}: LineShapeContext): string =>
  `M ${start.x} ${start.y} C ${anchorStart.x} ${anchorStart.y}, ${anchorEnd.x} ${anchorEnd.y}, ${end.x} ${end.y}`;

const straightPath = ({ start, end }: LineShapeContext): string =>
  `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

/**
 * Picks the axis a step route leaves `start` along. The anchor direction
 * (`start` → `anchorStart`) describes which way the connector faces, so it
 * wins; only when it is degenerate does the dominant delta decide.
 */
const leavesHorizontally = ({
  start,
  end,
  anchorStart,
}: LineShapeContext): boolean => {
  const exitX = Math.abs(anchorStart.x - start.x);
  const exitY = Math.abs(anchorStart.y - start.y);
  if (exitX !== exitY) {
    return exitX > exitY;
  }

  return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
};

/**
 * A Manhattan/step route: runs flat out of `start` along the connector's exit
 * axis, breaks at the midpoint, then runs flat into `end`. The break replaces
 * the smooth bend of a curve with hard corners.
 */
const brokenFlatLinePath = (context: LineShapeContext): string => {
  const { start, end } = context;
  if (leavesHorizontally(context)) {
    const midX = (start.x + end.x) / 2;
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  const midY = (start.y + end.y) / 2;
  return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
};

export const builtInLineShapes: Record<BuiltInLineShape, LineShapeGenerator> = {
  curved: cubicCurvePath,
  straight: straightPath,
  "broken-flat-line": brokenFlatLinePath,
};

export const LINE_DASH_ARRAYS: Record<LineDash, string | undefined> = {
  solid: undefined,
  dashed: "8 6",
  dotted: "2 5",
};

export const lineShapeRegistry: Map<string, LineShapeGenerator> = new Map(
  Object.entries(builtInLineShapes),
);

lineShapeRegistry.set("elbow", builtInLineShapes["broken-flat-line"]);
lineShapeRegistry.set("broken-elbow", builtInLineShapes["broken-flat-line"]);

export const registerLineShape = (
  name: string,
  generator: LineShapeGenerator,
): void => {
  lineShapeRegistry.set(name, generator);
};

export const unregisterLineShape = (name: string): boolean =>
  lineShapeRegistry.delete(name);

export const getLineShapeGenerator = (
  shape: LineShape,
): LineShapeGenerator =>
  lineShapeRegistry.get(shape) ?? builtInLineShapes.curved;

export const createLinePath = (
  shape: LineShape,
  context: LineShapeContext,
): string => getLineShapeGenerator(shape)(context);

export const getLineDashArray = (dash: LineDash): string | undefined =>
  LINE_DASH_ARRAYS[dash];
