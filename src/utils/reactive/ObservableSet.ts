import { createDeepObservable, DeepObservable, Subscriber } from "./Observable";

export type SetObserver<T> = Subscriber<ObservableSet<T>>;

export default class ObservableSet<T> {
  private set: Set<DeepObservable<T>>;
  private readonly _subscribers = new Set<SetObserver<T>>();

  constructor(initial?: Set<T>) {
    initial ??= new Set();
    this.set = new Set(Array.from(initial).map(createDeepObservable));
  }

  public wrap(set: Set<T>) {
    this.set = new Set(Array.from(set).map(createDeepObservable));
    this.notifySubscribers();
  }

  public unwrap(): Set<T> {
    return new Set(Array.from(this.set).map((item) => item.unwrap() as T));
  }

  public get size() {
    return this.set.size;
  }

  public get values() {
    return this.set.values();
  }

  public get entries() {
    return this.set.entries();
  }

  public get keys() {
    return this.set.keys();
  }

  public add(value: T) {
    const wrapped = createDeepObservable(value);
    if (!this.set.has(wrapped)) {
      this.set.add(wrapped);
      this.notifySubscribers();
    }
    return this;
  }

  public delete(value: T) {
    const wrapped = createDeepObservable(value);
    const result = this.set.delete(wrapped);
    if (result) this.notifySubscribers();
    return result;
  }

  public has(value: T) {
    const wrapped = createDeepObservable(value);
    return this.set.has(wrapped);
  }

  public clear() {
    this.set.clear();
    this.notifySubscribers();
  }

  public subscribe(subscriber: SetObserver<T>): () => void {
    this._subscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  public unsubscribe(subscriber: SetObserver<T>) {
    this._subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    this._subscribers.forEach((subscriber) => subscriber(this));
  }
}
