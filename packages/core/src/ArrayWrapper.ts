export default class ArrayWrapper<T> {
  private _array: T[];

  public constructor(array?: T[]) {
    this._array = array ?? [];
  }

  public get array(): ReadonlyArray<T> {
    return this._array;
  }

  public get length() {
    return this._array.length;
  }

  public at(index: number) {
    return this._array.at(index);
  }

  public forEach(callback: (value: T, index: number, array: T[]) => void) {
    this._array.forEach(callback);
  }

  public filter(callback: (value: T, index: number, array: T[]) => boolean) {
    return this._array.filter(callback);
  }

  public filterInPlace(
    callback: (value: T, index: number, array: T[]) => boolean,
  ) {
    this._array = this.filter(callback);
  }

  public map<U>(callback: (value: T, index: number, array: T[]) => U) {
    return this._array.map(callback);
  }

  public flatMap<U, This = undefined>(
    callback: (
      this: This,
      value: T,
      index: number,
      array: T[],
    ) => U | ReadonlyArray<U>,
  ): U[] {
    return this._array.flatMap(callback);
  }

  public find(callback: (value: T, index: number, array: T[]) => boolean) {
    return this._array.find(callback);
  }

  public findIndex(callback: (value: T, index: number, array: T[]) => boolean) {
    return this._array.findIndex(callback);
  }

  public splice(start: number, deleteCount: number, ...items: T[]) {
    this._array = [
      ...this._array.slice(0, start),
      ...items,
      ...this._array.slice(start + deleteCount),
    ];
  }

  public reduce<U>(
    callback: (
      previousValue: U,
      currentValue: T,
      currentIndex: number,
      array: T[],
    ) => U,
    initialValue: U,
  ) {
    return this._array.reduce(callback, initialValue);
  }

  public some(callback: (value: T, index: number, array: T[]) => boolean) {
    return this._array.some(callback);
  }

  public every(callback: (value: T, index: number, array: T[]) => boolean) {
    return this._array.every(callback);
  }

  public get(index: number) {
    return this._array[index];
  }

  public set(index: number, value: T) {
    this._array[index] = value;
  }

  public push(value: T) {
    this._array.push(value);
  }
}
