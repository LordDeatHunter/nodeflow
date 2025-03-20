import { Vec2 } from "../data";
import ObservableArray from "./ObservableArray";
import { deepCopy } from "../misc-utils";
import ObservableSet from "./ObservableSet";
import ObservableMap from "./ObservableMap";

/** Handler function for observable updates */
export type Subscriber<T> = (value: T) => void;

/**
 * Core observable class implementing pubsub pattern
 * Tracks value changes and notifies subscribers
 */
export class Observable<T> {
  private _value: T;
  private _subscribers = new Set<Subscriber<T>>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  /** Get a deep copy of the current value */
  public unwrap(): T {
    return deepCopy(this._value);
  }

  /** Update value and notify subscribers */
  public wrap(newValue: T): void {
    if (this._value === newValue) return;
    this._value = newValue;
    this._subscribers.forEach((subscriber) => subscriber(newValue));
  }

  /** Register a callback for value changes */
  public subscribe(subscriber: Subscriber<T>): () => void {
    this._subscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  /** Remove a previously registered callback */
  public unsubscribe(subscriber: Subscriber<T>): void {
    this._subscribers.delete(subscriber);
  }
}

/**
 * Type representing a deeply observable structure:
 * - Primitives become Observable<T>
 * - Arrays become ObservableArray
 * - Sets become ObservableSet
 * - Maps become ObservableMap
 * - Objects become recursively observable
 * - Vec2 instances become Observable<Vec2>
 */
export type DeepObservable<T> = [T] extends [Array<infer U>]
  ? ObservableArray<U>
  : [T] extends [Set<infer U>]
  ? ObservableSet<U>
  : [T] extends [Map<infer K, infer V>]
  ? ObservableMap<K, V>
  : [T] extends [Vec2]
  ? Observable<T>
  : T extends object
  ? Observable<{ [K in keyof T]: DeepObservable<T[K]> }>
  : Observable<T>;

/**
 * Creates a deep observable structure from any value:
 * - Wraps primitives in Observable
 * - Handles collections with observable variants
 * - Recursively processes objects
 */
export function createDeepObservable<T>(initial: T): DeepObservable<T> {
  // Handle arrays
  if (Array.isArray(initial)) {
    return new ObservableArray(initial) as DeepObservable<T>;
  }

  // Handle Sets
  if (initial instanceof Set) {
    return new ObservableSet(initial) as DeepObservable<T>;
  }

  // Handle Maps
  if (initial instanceof Map) {
    return new ObservableMap(initial) as DeepObservable<T>;
  }

  // Handle Vec2 instances
  if (initial instanceof Vec2) {
    return new Observable(initial) as DeepObservable<T>;
  }

  // Handle plain objects
  if (typeof initial === "object" && initial !== null) {
    const observableObject: Record<string, unknown> = {};
    for (const key in initial) {
      if (Object.hasOwn(initial, key)) {
        observableObject[key] = createDeepObservable(initial[key]);
      }
    }
    return new Observable(observableObject) as DeepObservable<T>;
  }

  // Handle primitives and other values
  return new Observable(initial) as DeepObservable<T>;
}
