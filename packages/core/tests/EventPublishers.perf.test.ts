import { describe, it, expect } from "vitest";
import { BaseEventPublisher } from "../src/EventPublishers";

type VoidPublisher = BaseEventPublisher<void, () => void>;

const makePublisher = (): VoidPublisher =>
  new BaseEventPublisher<void, () => void>();

describe("BaseEventPublisher – cache behaviour", () => {
  describe("pre-sorted cache produces correct ordering", () => {
    it("fires 5 subscribers in descending priority order (5,4,3,2,1)", () => {
      const pub = makePublisher();
      const order: number[] = [];

      pub.subscribe("p1", () => order.push(1), 1);
      pub.subscribe("p5", () => order.push(5), 5);
      pub.subscribe("p3", () => order.push(3), 3);
      pub.subscribe("p2", () => order.push(2), 2);
      pub.subscribe("p4", () => order.push(4), 4);

      pub.publish();

      expect(order).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe("cache invalidation on subscribe", () => {
    it("after adding a higher-priority subscriber, new subscriber fires first on next publish", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe("A", () => log.push("A"), 1);
      pub.publish();
      expect(log).toEqual(["A"]);

      pub.subscribe("B", () => log.push("B"), 2);
      pub.publish();

      expect(log).toEqual(["A", "B", "A"]);
    });
  });

  describe("cache invalidation on unsubscribe", () => {
    it("after unsubscribing B, only A fires on subsequent publish", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe("A", () => log.push("A"), 1);
      pub.subscribe("B", () => log.push("B"), 2);
      pub.publish();
      expect(log).toContain("A");
      expect(log).toContain("B");

      log.length = 0;
      pub.unsubscribe("B");
      pub.publish();

      expect(log).toEqual(["A"]);
    });
  });

  describe("cache invalidation on subscribeMultiple", () => {
    it("subscribers added via subscribeMultiple are sorted correctly on next publish", () => {
      const pub = makePublisher();
      const order: string[] = [];

      pub.subscribeMultiple([
        { name: "low", event: () => order.push("low"), priority: 1 },
        { name: "high", event: () => order.push("high"), priority: 10 },
        { name: "mid", event: () => order.push("mid"), priority: 5 },
      ]);

      pub.publish();

      expect(order).toEqual(["high", "mid", "low"]);
    });
  });

  describe("blacklist cache invalidation", () => {
    it("blacklisted subscriber does not fire; after unblacklist it fires again", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe("A", () => log.push("A"));

      pub.blacklist("block-A", (_data, name) => name === "A");
      pub.publish();
      expect(log).toEqual([]);

      pub.unblacklist("block-A");
      pub.publish();
      expect(log).toEqual(["A"]);
    });
  });

  describe("mid-publish subscribe (snapshot behaviour)", () => {
    it("subscriber added during a callback is NOT called in the same publish cycle but IS called in the next", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe("A", () => {
        log.push("A");
        pub.subscribe("B", () => log.push("B"));
      });

      pub.publish();
      expect(log).toEqual(["A"]);

      pub.publish();
      expect(log).toContain("B");
    });
  });

  describe("mid-publish unsubscribe (snapshot behaviour)", () => {
    it("B still fires in the publish where A unsubscribes it, but not in the next publish", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe(
        "A",
        () => {
          log.push("A");
          pub.unsubscribe("B");
        },
        10,
      );
      pub.subscribe("B", () => log.push("B"), 1);

      pub.publish();
      expect(log).toContain("A");
      expect(log).toContain("B");

      log.length = 0;
      pub.publish();
      expect(log).toEqual(["A"]);
    });
  });

  describe("publish with 0 blacklist filters", () => {
    it("subscriber fires normally when no blacklist filters are registered", () => {
      const pub = makePublisher();
      const log: string[] = [];

      pub.subscribe("A", () => log.push("A"));
      pub.publish();

      expect(log).toEqual(["A"]);
    });
  });
});
