import { ReactiveMap } from "@solid-primitives/map";
import { NodeflowData } from "./index";
import {
  DocumentEvent,
  DocumentEventsDataMap,
  NodeflowEvent,
  NodeflowEventsDataMap,
} from "../../nodeflow-types";

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

  public blacklist(
    key: string,
    filter: (data: EventData, key: string, priority: number) => boolean,
  ) {
    this.blacklistFilters.set(key, filter);
  }

  public unblacklist(key: string) {
    this.blacklistFilters.delete(key);
  }

  public unblacklistMultiple(keys: string[]) {
    keys.forEach(this.unblacklist);
  }

  public clearBlacklist() {
    this.blacklistFilters.clear();
  }

  public subscribe(name: string, callback: EventCallback, priority = 0) {
    this.subscriptions.set(name, { name, event: callback, priority });
  }

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

  public unsubscribe(key: string) {
    this.subscriptions.delete(key);
  }

  public unsubsribeMultiple(keys: string[]) {
    keys.forEach(this.unsubscribe);
  }

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
