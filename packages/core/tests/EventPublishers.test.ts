import { describe, it, expect } from "bun:test";
import { BaseEventPublisher } from "../../../src/utils/data/EventPublishers";

type StringPublisher = BaseEventPublisher<string, (data: string) => void>;

function makePublisher(): StringPublisher {
  return new BaseEventPublisher<string, (data: string) => void>();
}

describe("BaseEventPublisher", () => {
  describe("subscribe()", () => {
    it("registers a callback so that subsequent publish() calls it", () => {
      const pub = makePublisher();
      const received: string[] = [];
      pub.subscribe("handler", (data) => received.push(data));
      pub.publish("hello");
      expect(received).toEqual(["hello"]);
    });

    it("subscribing the same name twice overwrites — only the second callback fires", () => {
      const pub = makePublisher();
      const callCount: number[] = [];
      pub.subscribe("handler", () => callCount.push(1));
      pub.subscribe("handler", () => callCount.push(2));
      pub.publish("event");
      expect(callCount).toEqual([2]);
    });
  });

  describe("publish()", () => {
    it("forwards the published data unchanged to all subscribers", () => {
      const pub = makePublisher();
      let received: string | null = null;
      pub.subscribe("h", (data) => {
        received = data;
      });
      pub.publish("test-payload");
      expect(received).toBe("test-payload");
    });

    it("does not throw when there are no subscribers", () => {
      const pub = makePublisher();
      expect(() => pub.publish("no-subscribers")).not.toThrow();
    });
  });

  describe("priority ordering", () => {
    it("calls higher-priority subscribers before lower-priority ones", () => {
      const pub = makePublisher();
      const order: string[] = [];
      pub.subscribe("low", () => order.push("low"), 0);
      pub.subscribe("high", () => order.push("high"), 10);
      pub.subscribe("medium", () => order.push("medium"), 5);
      pub.publish("x");
      expect(order).toEqual(["high", "medium", "low"]);
    });
  });

  describe("blacklist()", () => {
    it("prevents a subscriber from receiving events when its name matches the filter", () => {
      const pub = makePublisher();
      const received: string[] = [];
      pub.subscribe("allowed", (data) => received.push(`allowed:${data}`));
      pub.subscribe("blocked", (data) => received.push(`blocked:${data}`));
      pub.blacklist(
        "my-filter",
        (_data, subscriberName) => subscriberName === "blocked",
      );
      pub.publish("event");
      expect(received).toEqual(["allowed:event"]);
    });

    it("re-allows subscriber after unblacklist()", () => {
      const pub = makePublisher();
      const received: string[] = [];
      pub.subscribe("h", (data) => received.push(data));
      pub.blacklist("f", () => true);
      pub.publish("muted");
      expect(received).toEqual([]);
      pub.unblacklist("f");
      pub.publish("audible");
      expect(received).toEqual(["audible"]);
    });
  });

  describe("subscribeMultiple()", () => {
    it("registers all provided callbacks and each receives published data", () => {
      const pub = makePublisher();
      const log: string[] = [];
      pub.subscribeMultiple([
        { name: "a", event: (d) => log.push(`a:${d}`) },
        { name: "b", event: (d) => log.push(`b:${d}`), priority: 5 },
        { name: "c", event: (d) => log.push(`c:${d}`) },
      ]);
      pub.publish("multi");
      expect(log).toContain("a:multi");
      expect(log).toContain("b:multi");
      expect(log).toContain("c:multi");
      expect(log.indexOf("b:multi")).toBeLessThan(log.indexOf("a:multi"));
    });
  });

  describe("unsubscribe()", () => {
    it("removes the named callback so it is no longer called after unsubscribe", () => {
      const pub = makePublisher();
      const received: string[] = [];
      pub.subscribe("h", (data) => received.push(data));
      pub.publish("before");
      pub.unsubscribe("h");
      pub.publish("after");
      expect(received).toEqual(["before"]);
    });
  });

  describe("size and isEmpty", () => {
    it("tracks subscription count and isEmpty status correctly", () => {
      const pub = makePublisher();
      expect(pub.isEmpty).toBe(true);
      expect(pub.size).toBe(0);
      pub.subscribe("a", () => {});
      expect(pub.size).toBe(1);
      expect(pub.isEmpty).toBe(false);
      pub.subscribe("b", () => {});
      expect(pub.size).toBe(2);
      pub.unsubscribe("a");
      expect(pub.size).toBe(1);
      pub.clear();
      expect(pub.size).toBe(0);
      expect(pub.isEmpty).toBe(true);
    });
  });

  describe("clearBlacklist()", () => {
    it("removes all blacklist filters so subscribers receive events again", () => {
      const pub = makePublisher();
      const received: string[] = [];
      pub.subscribe("h", (data) => received.push(data));
      pub.blacklist("f1", () => true);
      pub.blacklist("f2", () => true);
      pub.publish("blocked");
      expect(received).toEqual([]);
      pub.clearBlacklist();
      pub.publish("unblocked");
      expect(received).toEqual(["unblocked"]);
    });
  });
});
