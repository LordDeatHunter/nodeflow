import { deepCopy } from "../misc-utils";

export type SetObserver<K> = (set: Set<K>) => void;

export default class ObservableSet<K> {
  private readonly set;
  private readonly _subscribers;

  constructor(set?: Set<K>) {
    this.set = set || new Set();
    this._subscribers = new Set<SetObserver<K>>();
  }

  public wrap(set: Set<K>) {
    this.set.clear();
    set.forEach((value) => this.set.add(value));
    this.notifySubscribers();
  }

  public unwrap() {
    return deepCopy(this.set);
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

  public add(value: K) {
    this.set.add(value);
    this.notifySubscribers();
  }

  public delete(value: K) {
    this.set.delete(value);
    this.notifySubscribers();
  }

  public has(value: K) {
    return this.set.has(value);
  }

  public clear() {
    this.set.clear();
    this.notifySubscribers();
  }

  public subscribe(subscriber: SetObserver<K>) {
    this._subscribers.add(subscriber);
  }

  public unsubscribe(subscriber: SetObserver<K>) {
    this._subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    this._subscribers.forEach((subscriber) => subscriber(this.set));
  }
}
