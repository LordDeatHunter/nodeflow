import { Position } from "../types/types";

export const addPositions = (...positions: Position[]): Position => {
  return positions.reduce(
    (acc, curr) => {
      return { x: acc.x + curr.x, y: acc.y + curr.y };
    },
    { x: 0, y: 0 }
  );
};

export const shiftPosition = (position: Position, shift: number): Position => ({
  x: position.x + shift,
  y: position.y + shift,
});
