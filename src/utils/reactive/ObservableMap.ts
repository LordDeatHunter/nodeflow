import { createDeepObservable, DeepObservable, Subscriber } from "./Observable";

export type MapObserver<K, V> = Subscriber<ObservableMap<K, V>>;

export default class ObservableMap<K, V> {
  private map: Map<DeepObservable<K>, DeepObservable<V>>;
  private readonly _subscribers = new Set<MapObserver<K, V>>();

  constructor(initial?: Map<K, V>) {
    initial ??= new Map();
    this.map = new Map(
      Array.from(initial.entries()).map(([k, v]) => [
        createDeepObservable(k),
        createDeepObservable(v),
      ]),
    );
  }

  public wrap(map: Map<K, V>) {
    this.map = new Map(
      Array.from(map.entries()).map(([k, v]) => [
        createDeepObservable(k),
        createDeepObservable(v),
      ]),
    );
    this.notifySubscribers();
  }

  public unwrap(): Map<K, V> {
    return new Map(
      Array.from(this.map.entries()).map(
        ([k, v]) => [k.unwrap(), v.unwrap()] as [K, V],
      ),
    );
  }

  public get(key: K) {
    const wrappedKey = createDeepObservable(key);
    return this.map.get(wrappedKey);
  }

  public set(key: K, value: V) {
    const wrappedKey = createDeepObservable(key);
    const wrappedValue = createDeepObservable(value);
    this.map.set(wrappedKey, wrappedValue);
    this.notifySubscribers();
    return this;
  }

  public delete(key: K) {
    const wrappedKey = createDeepObservable(key);
    const result = this.map.delete(wrappedKey);
    if (result) this.notifySubscribers();
    return result;
  }

  public subscribe(subscriber: MapObserver<K, V>) {
    this._subscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  public unsubscribe(subscriber: MapObserver<K, V>) {
    this._subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    this._subscribers.forEach((subscriber) => subscriber(this));
  }

  public get size() {
    return this.map.size;
  }

  public keys() {
    return this.map.keys();
  }

  public values() {
    return this.map.values();
  }

  public entries() {
    return this.map.entries();
  }

  public clear() {
    this.map.clear();
    this.notifySubscribers();
  }

  public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void) {
    this.map.forEach((value, key) =>
      callbackfn(value.unwrap() as V, key.unwrap() as K, this.unwrap()),
    );
  }

  public has(key: K) {
    const wrappedKey = createDeepObservable(key);
    return this.map.has(wrappedKey);
  }

  public [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }

  public get [Symbol.toStringTag]() {
    return this.map[Symbol.toStringTag];
  }
}
