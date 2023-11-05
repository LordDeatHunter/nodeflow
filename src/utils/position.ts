import { Size } from "./size";

export class Position {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public static copy(position: Position): Position {
    return new Position(position.x, position.y);
  }

  public static default(): Position {
    return new Position(0, 0);
  }

  public static fromSize(size: Size): Position {
    return new Position(size.width, size.height);
  }

  public add(...positions: Position[]): Position {
    return positions.reduce(
      (accumulator, current) =>
        new Position(accumulator.x + current.x, accumulator.y + current.y),
      this,
    );
  }

  public subtract(...positions: Position[]): Position {
    return positions.reduce(
      (accumulator, current) =>
        new Position(accumulator.x - current.x, accumulator.y - current.y),
      this,
    );
  }

  public multiply(...position: Position[]): Position {
    return position.reduce(
      (position, current) =>
        new Position(position.x * current.x, position.y * current.y),
      this,
    );
  }

  public divide(...position: Position[]): Position {
    return position.reduce(
      (position, current) =>
        new Position(current.x / position.x, current.y / position.y),
      this,
    );
  }

  public negate(): Position {
    return new Position(-this.x, -this.y);
  }

  public shift(shift: number): Position {
    return new Position(this.x + shift, this.y + shift);
  }

  public multiplyBy(amount: number): Position {
    return new Position(this.x * amount, this.y * amount);
  }

  public divideBy(amount: number): Position {
    return new Position(this.x / amount, this.y / amount);
  }
}
