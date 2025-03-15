import { createDeepObservable, DeepObservable } from "./Observable";
import { deepCopy } from "../misc-utils";

export type ArrayObserver<T> = (array: DeepObservable<T>[]) => void;

export default class ObservableArray<T> {
  private array: DeepObservable<T>[];
  private readonly _subscribers: Set<ArrayObserver<T>>;

  constructor(array: T[] = []) {
    this.array = array.map(createDeepObservable);
    this._subscribers = new Set();
  }

  public get length() {
    return this.array.length;
  }

  public unwrap(index: number) {
    return deepCopy(this.array[index]);
  }

  public wrap(index: number, value: T) {
    this.array[index] = createDeepObservable(value);
    this.notifySubscribers();
  }

  public push(value: T) {
    this.array.push(createDeepObservable(value));
    this.notifySubscribers();
  }

  public pop() {
    this.array.pop();
    this.notifySubscribers();
  }

  public shift() {
    this.array.shift();
    this.notifySubscribers();
  }

  public unshift(value: T, notify = true) {
    this.array.unshift(createDeepObservable(value));
    this.notifySubscribers();
  }

  public splice(start: number, deleteCount: number, ...items: T[]) {
    this.array.splice(start, deleteCount, ...items.map(createDeepObservable));
    this.notifySubscribers();
  }

  public filterInPlace(predicate: (value: T) => boolean) {
    this.array = this.array.filter((value: DeepObservable<T>) =>
      predicate(value.unwrap()),
    );
    this.notifySubscribers();
  }

  public subscribe(subscriber: ArrayObserver<T>) {
    this._subscribers.add(subscriber);

    return () => {
      this.unsubscribe(subscriber);
    };
  }

  public unsubscribe(subscriber: ArrayObserver<T>) {
    this._subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    this._subscribers.forEach((subscriber) => subscriber(this.array));
  }
}
