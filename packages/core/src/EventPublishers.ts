import {
  DocumentEvent,
  DocumentEventsDataMap,
  NodeflowEvent,
  NodeflowEventsDataMap,
} from "./event-types";

export class BaseEventPublisher<
  EventData,
  EventCallback extends (data: EventData) => void,
> {
  private subscriptions = new Map<
    string,
    { event: EventCallback; name: string; priority: number }
  >();
  private blacklistFilters = new Map<
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
    keys.forEach(this.unblacklist.bind(this));
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
    keys.forEach(this.unsubscribe.bind(this));
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
  public readonly nodeflowData: any;

  public constructor(nodeflowData: any) {
    super();
    this.nodeflowData = nodeflowData;
  }
}

export class DocumentEventPublisher<
  T extends keyof DocumentEventsDataMap,
> extends BaseEventPublisher<DocumentEventsDataMap[T], DocumentEvent<T>> {}

export type NodeflowEventRecord = {
  [K in keyof NodeflowEventsDataMap]: NodeflowEventPublisher<K>;
};

export type DocumentEventRecord = {
  [K in keyof DocumentEventsDataMap]: DocumentEventPublisher<K>;
};
