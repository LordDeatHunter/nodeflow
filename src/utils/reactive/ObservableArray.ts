import { createDeepObservable, DeepObservable, Subscriber } from "./Observable";
import { Optional } from "../../nodeflow-types";

export type ArrayObserver<T> = Subscriber<ObservableArray<T>>;

export default class ObservableArray<T> {
  private array: DeepObservable<T>[];
  private readonly _subscribers = new Set<ArrayObserver<T>>();

  constructor(initial?: T[]) {
    initial ??= [];
    this.array = initial.map(createDeepObservable);
  }

  public get length() {
    return this.array.length;
  }

  public unwrap(): T[] {
    return this.array.map((item) => item.unwrap() as T);
  }

  public wrap(value: T[]) {
    this.array = value.map(createDeepObservable);
    this.notifySubscribers();
  }

  public push(...values: T[]) {
    const wrapped = values.map(createDeepObservable);
    this.array.push(...wrapped);
    this.notifySubscribers();
  }

  public pop(): Optional<DeepObservable<T>> {
    const item = this.array.pop();
    this.notifySubscribers();
    return item;
  }

  public at(index: number): Optional<DeepObservable<T>> {
    return this.array.at(index);
  }

  public shift(): Optional<DeepObservable<T>> {
    const item = this.array.shift();
    this.notifySubscribers();
    return item;
  }

  public unshift(value: T): number {
    const len = this.array.unshift(createDeepObservable(value));
    this.notifySubscribers();
    return len;
  }

  public splice(
    start: number,
    deleteCount: number,
    ...items: T[]
  ): DeepObservable<T>[] {
    const spliced = this.array.splice(
      start,
      deleteCount,
      ...items.map(createDeepObservable),
    );
    this.notifySubscribers();
    return spliced;
  }

  public filterInPlace(predicate: (value: T) => boolean) {
    this.array = this.array.filter((value: DeepObservable<T>) =>
      predicate(value.unwrap() as T),
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
    this._subscribers.forEach((subscriber) => subscriber(this));
  }
}
