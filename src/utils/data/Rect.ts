import Vec2 from "./Vec2";

export default class Rect {
  public position: Vec2;
  public size: Vec2;

  private constructor(x: number, y: number, width: number, height: number) {
    this.position = Vec2.of(x, y);
    this.size = Vec2.of(width, height);
  }

  public static of(position: Vec2, size: Vec2): Rect {
    return new Rect(position.x, position.y, size.x, size.y);
  }

  public static fromRect(rect: Rect): Rect {
    return new Rect(rect.position.x, rect.position.y, rect.size.x, rect.size.y);
  }

  public copy(): Rect {
    return Rect.fromRect(this);
  }

  public get center(): Vec2 {
    return this.position.add(this.size.divideBy(2));
  }

  public intersects(other: Rect): boolean {
    return (
      this.position.x < other.position.x + other.size.x &&
      this.position.x + this.size.x > other.position.x &&
      this.position.y < other.position.y + other.size.y &&
      this.position.y + this.size.y > other.position.y
    );
  }
}
