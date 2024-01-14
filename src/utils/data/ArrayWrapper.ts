import { createStore } from "solid-js/store";

export default class ArrayWrapper<T> {
  private readonly store;

  public constructor(array: T[]) {
    this.store = createStore<T[]>(array);
  }

  public get array(): ReadonlyArray<T> {
    return this.store[0];
  }

  public get length() {
    return this.store[0].length;
  }

  public forEach(callback: (value: T, index: number, array: T[]) => void) {
    this.store[0].forEach(callback);
  }

  public filter(callback: (value: T, index: number, array: T[]) => boolean) {
    return this.store[0].filter(callback);
  }

  public filterInPlace(
    callback: (value: T, index: number, array: T[]) => boolean,
  ) {
    this.store[1](this.filter(callback));
  }

  public map<U>(callback: (value: T, index: number, array: T[]) => U) {
    return this.store[0].map(callback);
  }

  public flatMap<U, This = undefined>(
    callback: (
      this: This,
      value: T,
      index: number,
      array: T[],
    ) => U | ReadonlyArray<U>,
  ): U[] {
    return this.store[0].flatMap(callback);
  }

  public find(callback: (value: T, index: number, array: T[]) => boolean) {
    return this.store[0].find(callback);
  }

  public findIndex(callback: (value: T, index: number, array: T[]) => boolean) {
    return this.store[0].findIndex(callback);
  }

  public splice(start: number, deleteCount: number, ...items: T[]) {
    this.store[1](this.store[0].splice(start, deleteCount, ...items));
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
    return this.store[0].reduce(callback, initialValue);
  }

  public some(callback: (value: T, index: number, array: T[]) => boolean) {
    return this.store[0].some(callback);
  }

  public every(callback: (value: T, index: number, array: T[]) => boolean) {
    return this.store[0].every(callback);
  }

  public get(index: number) {
    return this.store[0][index];
  }

  public set(index: number, value: T) {
    this.store[1](index, value);
  }

  public push(value: T) {
    this.store[1](this.store[0].length, value);
  }
}
