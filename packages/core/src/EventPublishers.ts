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

  // Cached sorted array of subscribers — null means stale, rebuilt on next publish().
  // This is a snapshot: mid-publish subscribe/unsubscribe won't affect the current
  // iteration, but will invalidate the cache so the next publish() picks up changes.
  private _sortedCache: Array<{
    event: EventCallback;
    name: string;
    priority: number;
  }> | null = null;

  // Cached array of blacklist filters — null means stale, rebuilt on next publish().
  private _blacklistCache: Array<
    (data: EventData, eventName: string, priority: number) => boolean
  > | null = null;

  public blacklist(
    key: string,
    filter: (data: EventData, key: string, priority: number) => boolean,
  ) {
    this.blacklistFilters.set(key, filter);
    this._blacklistCache = null;
  }

  public unblacklist(key: string) {
    this.blacklistFilters.delete(key);
    this._blacklistCache = null;
  }

  public unblacklistMultiple(keys: string[]) {
    keys.forEach(this.unblacklist.bind(this));
  }

  public clearBlacklist() {
    this.blacklistFilters.clear();
    this._blacklistCache = null;
  }

  public subscribe(name: string, callback: EventCallback, priority = 0) {
    this.subscriptions.set(name, { name, event: callback, priority });
    this._sortedCache = null;
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
    this._sortedCache = null;
  }

  public unsubsribeMultiple(keys: string[]) {
    keys.forEach(this.unsubscribe.bind(this));
  }

  public publish(data: EventData) {
    if (!this._sortedCache) {
      this._sortedCache = Array.from(this.subscriptions.values()).sort(
        (a, b) => b.priority - a.priority,
      );
    }
    const subscribers = this._sortedCache;
    const filters =
      this._blacklistCache ??
      (this.blacklistFilters.size > 0
        ? (this._blacklistCache = Array.from(this.blacklistFilters.values()))
        : null);
    for (const sub of subscribers) {
      if (filters && filters.some((f) => f(data, sub.name, sub.priority)))
        continue;
      sub.event(data);
    }
  }

  public clear() {
    this.subscriptions.clear();
    this._sortedCache = null;
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
