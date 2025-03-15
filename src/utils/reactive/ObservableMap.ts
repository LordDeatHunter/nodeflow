import { deepCopy } from "../misc-utils";

export type MapObserver<K, V> = (map: Map<K, V>) => void;

export default class ObservableMap<K, V> {
  private readonly map;
  private readonly _subscribers;

  constructor(map?: Map<K, V>) {
    this.map = map || new Map();
    this._subscribers = new Set<MapObserver<K, V>>();
  }

  public wrap(map: Map<K, V>) {
    this.map.clear();
    map.forEach((value, key) => this.map.set(key, value));
    this.notifySubscribers();
  }

  public unwrap() {
    return deepCopy(this.map);
  }

  public get(key: K) {
    return deepCopy(this.map.get(key));
  }

  public set(key: K, value: V) {
    this.map.set(key, value);
    this.notifySubscribers();
  }

  public delete(key: K) {
    this.map.delete(key);
    this.notifySubscribers();
  }

  public subscribe(subscriber: MapObserver<K, V>) {
    this._subscribers.add(subscriber);

    return () => {
      this.unsubscribe(subscriber);
    };
  }

  public unsubscribe(subscriber: MapObserver<K, V>) {
    this._subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    this._subscribers.forEach((subscriber) => subscriber(this.map));
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
    this.map.forEach(callbackfn);
  }

  public has(key: K) {
    return this.map.has(key);
  }

  public [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }

  public get [Symbol.toStringTag]() {
    return this.map[Symbol.toStringTag];
  }
}
