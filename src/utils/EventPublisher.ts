import { DrawflowEvent, DrawflowEventsDataMap } from "./events";

export class EventPublisher<T extends keyof DrawflowEventsDataMap> {
  private subscriptions = new Map<string, DrawflowEvent<T>>();

  subscribe(key: string, callback: DrawflowEvent<T>) {
    this.subscriptions.set(key, callback);
  }

  unsubscribe(key: string) {
    this.subscriptions.delete(key);
  }

  publish(data: DrawflowEventsDataMap[T]) {
    this.subscriptions.forEach((callback) => callback(data));
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
