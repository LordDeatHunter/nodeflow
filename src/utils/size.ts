import { Position } from "./position";

// TODO: replace usage of this class with Position
export class Size {
  public width: number;
  public height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public static default(): Size {
    return new Size(0, 0);
  }

  public static fromPosition(position: Position): Size {
    return new Size(position.x, position.y);
  }

  public add(size: Size): Size {
    return new Size(this.width + size.width, this.height + size.height);
  }

  public subtract(size: Size): Size {
    return new Size(this.width - size.width, this.height - size.height);
  }

  public multiply(size: Size): Size {
    return new Size(this.width * size.width, this.height * size.height);
  }

  public divide(size: Size): Size {
    return new Size(this.width / size.width, this.height / size.height);
  }

  public negate(): Size {
    return new Size(-this.width, -this.height);
  }

  public shift(shift: number): Size {
    return new Size(this.width + shift, this.height + shift);
  }

  public multiplyBy(amount: number): Size {
    return new Size(this.width * amount, this.height * amount);
  }

  public divideBy(amount: number): Size {
    return new Size(this.width / amount, this.height / amount);
  }

  public equals(size: Size): boolean {
    return this.width === size.width && this.height === size.height;
  }

  public toString(): string {
    return `${this.width}x${this.height}`;
  }
}
