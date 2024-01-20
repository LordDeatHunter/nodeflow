import { SerializedVec2 } from "../../drawflow-types";

export default class Vec2 {
  public x: number;
  public y: number;

  private constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  public static of(x: number, y: number): Vec2 {
    return new Vec2(x, y);
  }

  public static fromEvent<T extends { clientX: number; clientY: number }>(
    event: T,
  ): Vec2 {
    return new Vec2(event.clientX, event.clientY);
  }

  public static fromVec2(position: Vec2): Vec2 {
    return new Vec2(position.x, position.y);
  }

  public copy(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  public serialize(): SerializedVec2 {
    return {
      x: this.x,
      y: this.y,
    };
  }

  public static deserialize(serialized: SerializedVec2): Vec2 {
    return new Vec2(serialized.x, serialized.y);
  }

  static deserializeOrDefault(
    serialized?: SerializedVec2,
    defaultValue = Vec2.zero(),
  ): Vec2 {
    return serialized ? Vec2.deserialize(serialized) : defaultValue;
  }

  public add(...positions: Vec2[]): Vec2 {
    return positions.reduce(
      (accumulator, current) =>
        new Vec2(accumulator.x + current.x, accumulator.y + current.y),
      this,
    );
  }

  public subtract(...positions: Vec2[]): Vec2 {
    return positions.reduce(
      (accumulator, current) =>
        new Vec2(accumulator.x - current.x, accumulator.y - current.y),
      this,
    );
  }

  public multiply(...position: Vec2[]): Vec2 {
    return position.reduce(
      (position, current) =>
        new Vec2(position.x * current.x, position.y * current.y),
      this,
    );
  }

  public divide(...position: Vec2[]): Vec2 {
    return position.reduce(
      (position, current) =>
        new Vec2(current.x / position.x, current.y / position.y),
      this,
    );
  }

  public negate(): Vec2 {
    return new Vec2(-this.x, -this.y);
  }

  public shift(shift: number): Vec2 {
    return new Vec2(this.x + shift, this.y + shift);
  }

  public multiplyBy(amount: number): Vec2 {
    return new Vec2(this.x * amount, this.y * amount);
  }

  public divideBy(amount: number): Vec2 {
    return new Vec2(this.x / amount, this.y / amount);
  }

  public isWithinRect(start: Vec2, size: Vec2): boolean {
    return (
      this.x >= start.x &&
      this.x <= start.x + size.x &&
      this.y >= start.y &&
      this.y <= start.y + size.y
    );
  }
}
