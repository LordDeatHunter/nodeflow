import { Vec2 } from "../data";
import ObservableArray from "./ObservableArray";
import { deepCopy } from "../misc-utils";
import ObservableSet from "./ObservableSet";
import ObservableMap from "./ObservableMap";

export default class Observable<T> {
  private _value: T;
  private _subscribers: Set<(value: T) => void>;

  constructor(value: T) {
    this._value = value;
    this._subscribers = new Set();
  }

  public unwrap() {
    return deepCopy(this._value);
  }

  public wrap(value: T) {
    this._value = value;
    this._subscribers.forEach((subscriber) => subscriber(value));
  }

  public subscribe(subscriber: (value: T) => void) {
    this._subscribers.add(subscriber);

    return () => {
      this.unsubscribe(subscriber);
    };
  }

  public unsubscribe(subscriber: (value: T) => void) {
    this._subscribers.delete(subscriber);
  }
}

// export type DeepObservable<T> = T extends Array<infer U>
//   ? DeepObservable<U>[]
//   : T extends object
//   ? { [K in keyof T]: DeepObservable<T[K]> }
//   : Observable<T>;

export type DeepObservable<T> = T extends Array<infer U>
  ? ObservableArray<U>
  : T extends Set<infer U>
  ? ObservableSet<U>
  : T extends Map<infer K, infer V>
  ? ObservableMap<K, V>
  : T extends Vec2
  ? Observable<T>
  : T extends object
  ? { [K in keyof T]: DeepObservable<T[K]> }
  : Observable<T>;

/**
 * Recursively wraps all values in an object or array as Observables.
 * @param initial - The structure to wrap
 * @returns A new structure with all non-object, non-array values wrapped in Observables
 */
export function createDeepObservable<T>(initial: T): DeepObservable<T> {
  if (Array.isArray(initial)) {
    return new ObservableArray<T>(initial) as DeepObservable<T>;
  }

  if (initial instanceof Set) {
    return new ObservableSet(initial) as DeepObservable<T>;
  }

  if (initial instanceof Vec2) {
    return new Observable(initial) as DeepObservable<T>;
  }

  if (initial instanceof Map) {
    return new ObservableMap(initial) as DeepObservable<T>;
  }

  if (initial !== null && typeof initial === "object") {
    const result: Record<string, unknown> = {};

    for (const key in initial) {
      if (Object.prototype.hasOwnProperty.call(initial, key)) {
        const value = initial[key];
        result[key] = createDeepObservable(value);
      }
    }

    return result as DeepObservable<T>;
  }

  return new Observable(initial) as DeepObservable<T>;
}
