import { DrawflowEvent, DrawflowEventsDataMap } from "./events";
import { ReactiveMap } from "@solid-primitives/map";

export class BaseEventPublisher<
  EventData,
  EventCallback extends (data: EventData) => void,
> {
  /**
   * Priority is a number that determines the order in which events are called.
   * The higher the number, the earlier the event is called.
   * If two events have the same priority, the order is not guaranteed.
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

  blacklist(
    key: string,
    filter: (data: EventData, key: string, priority: number) => boolean,
  ) {
    this.blacklistFilters.set(key, filter);
  }

  unblacklist(key: string) {
    this.blacklistFilters.delete(key);
  }

  unblacklistMultiple(keys: string[]) {
    keys.forEach(this.unblacklist);
  }

  clearBlacklist() {
    this.blacklistFilters.clear();
  }

  subscribe(name: string, callback: EventCallback, priority = 0) {
    this.subscriptions.set(name, { name, event: callback, priority });
  }

  subscribeMultiple(
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

  unsubscribe(key: string) {
    this.subscriptions.delete(key);
  }

  unsubsribeMultiple(keys: string[]) {
    keys.forEach(this.unsubscribe);
  }

  publish(data: EventData) {
    Array.from(this.subscriptions.values())
      .sort((a, b) => b.priority - a.priority)
      .filter(({ name, priority }) => {
        const filters = Array.from(this.blacklistFilters.values());
        return !filters.some((filter) => filter(data, name, priority));
      })
      .map(({ event }) => event)
      .forEach((callback) => callback(data));
  }

  clear() {
    this.subscriptions.clear();
  }

  get size() {
    return this.subscriptions.size;
  }

  get isEmpty() {
    return this.size === 0;
  }
}

export class DrawflowEventPublisher<
  T extends keyof DrawflowEventsDataMap,
> extends BaseEventPublisher<DrawflowEventsDataMap[T], DrawflowEvent<T>> {}
