import { ReactiveMap } from "@solid-primitives/map";
import { NodeflowData } from "./index";
import {
  DocumentEvent,
  DocumentEventsDataMap,
  NodeflowEvent,
  NodeflowEventsDataMap,
} from "../../nodeflow-types";

/**
 * Represents a base event publisher that can be used to publish events of a certain type to subscribers
 */
export class BaseEventPublisher<
  EventData,
  EventCallback extends (data: EventData) => void,
> {
  /**
   * Priority is a number that determines the order in which events are called.\
   * The higher the number, the earlier the event is called.\
   * If two events have the same priority, the order is not guaranteed.\
   * The default priority is 0.
   */
  private subscriptions = new ReactiveMap<
    string,
    { event: EventCallback; name: string; priority: number }
  >();
  private blacklistFilters = new ReactiveMap<
    string,
    (data: EventData, eventName: string, priority: number) => boolean
  >();

  /**
   * Blacklists an event handler from being called for a specific event if the provided filter returns true.
   *
   * @param key - The key of blacklist
   * @param filter - The filter to use
   */
  public blacklist(
    key: string,
    filter: (data: EventData, key: string, priority: number) => boolean,
  ) {
    this.blacklistFilters.set(key, filter);
  }

  /**
   * Removes a blacklist filter with the given key
   *
   * @param key - The key of the blacklist filter to remove
   */
  public unblacklist(key: string) {
    this.blacklistFilters.delete(key);
  }

  /**
   * Removes multiple blacklist filters with the given keys
   *
   * @param keys - A list of keys of the blacklist filters to remove
   */
  public unblacklistMultiple(keys: string[]) {
    keys.forEach(this.unblacklist);
  }

  /**
   * Clears all blacklist filters
   */
  public clearBlacklist() {
    this.blacklistFilters.clear();
  }

  /**
   * Adds an event handler to the current event publisher
   *
   * @param name - The name of the event handler
   * @param callback - The event handler
   * @param priority - The priority of the event handler
   */
  public subscribe(name: string, callback: EventCallback, priority = 0) {
    this.subscriptions.set(name, { name, event: callback, priority });
  }

  /**
   * Adds multiple event handlers to the current event publisher
   *
   * @param subscriptions - A list of event handlers to add
   */
  public subscribeMultiple(
    subscriptions: {
      name: string;
      event: EventCallback;
      priority?: number;
    }[],
  ) {
    subscriptions.forEach(({ name, event, priority }) =>
      this.subscribe(name, event, priority),
    );
  }

  /**
   * Removes an event handler with the given key
   *
   * @param key - The key of the event handler to remove
   */
  public unsubscribe(key: string) {
    this.subscriptions.delete(key);
  }

  /**
   * Removes multiple event handlers with the given keys
   *
   * @param keys - The keys of the event handlers to remove
   */
  public unsubsribeMultiple(keys: string[]) {
    keys.forEach(this.unsubscribe);
  }

  /**
   * Publishes an event to all subscribers
   *
   * @param data - The data to publish
   */
  public publish(data: EventData) {
    Array.from(this.subscriptions.values())
      .sort((a, b) => b.priority - a.priority)
      .filter(({ name, priority }) => {
        const filters = Array.from(this.blacklistFilters.values());
        return !filters.some((filter) => filter(data, name, priority));
      })
      .map(({ event }) => event)
      .forEach((callback) => callback(data));
  }

  public clear() {
    this.subscriptions.clear();
  }

  get size() {
    return this.subscriptions.size;
  }

  get isEmpty() {
    return this.size === 0;
  }
}

export class NodeflowEventPublisher<
  T extends keyof NodeflowEventsDataMap,
> extends BaseEventPublisher<NodeflowEventsDataMap[T], NodeflowEvent<T>> {
  public readonly nodeflowData: NodeflowData;

  public constructor(nodeflowData: NodeflowData) {
    super();
    this.nodeflowData = nodeflowData;
  }
}

export class DocumentEventPublisher<
  T extends keyof DocumentEventsDataMap,
> extends BaseEventPublisher<DocumentEventsDataMap[T], DocumentEvent<T>> {}
