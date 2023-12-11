export class Vec2 {
  public x: number;
  public y: number;

  private constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public static of(x: number, y: number): Vec2 {
    return new Vec2(x, y);
  }

  public static copy(position: Vec2): Vec2 {
    return new Vec2(position.x, position.y);
  }

  public static default(): Vec2 {
    return new Vec2(0, 0);
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
}
