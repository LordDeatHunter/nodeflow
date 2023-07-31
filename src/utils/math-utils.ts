import { Position, Size } from "../types/types";

export const convertSizeToPosition = (size: Size): Position => ({
  x: size.width,
  y: size.height,
});

export const addPositions = (...positions: Position[]): Position =>
  positions.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), {
    x: 0,
    y: 0,
  });

export const subtractPositions = (...positions: Position[]): Position =>
  positions.reduce(
    (acc, curr, i) =>
      i === 0 ? curr : { x: acc.x - curr.x, y: acc.y - curr.y },
    { x: 0, y: 0 }
  );

export const multiplyPositions = (...positions: Position[]): Position =>
  positions.reduce((acc, curr) => ({ x: acc.x * curr.x, y: acc.y * curr.y }), {
    x: 0,
    y: 0,
  });

export const negatePosition = (position: Position): Position => ({
  x: -position.x,
  y: -position.y,
});

export const shiftPosition = (position: Position, shift: number): Position => ({
  x: position.x + shift,
  y: position.y + shift,
});

export const multiplyPosition = (
  position: Position,
  amount: number
): Position => ({
  x: position.x * amount,
  y: position.y * amount,
});

export const dividePosition = (
  position: Position,
  amount: number
): Position => ({
  x: position.x / amount,
  y: position.y / amount,
});

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);