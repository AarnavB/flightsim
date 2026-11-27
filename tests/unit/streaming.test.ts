import { describe, expect, it } from "vitest";
import {
  TileLifecycle,
  PriorityScheduler,
  LruCache,
  TileTree
} from "../../packages/world-streaming/src/index";

describe("lazy quadtree metadata", () => {
  it("materialises only requested nodes and their children", () => {
    const tree = new TileTree();
    expect(tree.knownNodeCount).toBe(0);
    tree.get("0/0/0");
    expect(tree.knownNodeCount).toBe(1);
    expect(tree.children("0/0/0")).toHaveLength(4);
    expect(tree.knownNodeCount).toBe(5);
  });
});

describe("tile lifecycle", () => {
  it("enforces the loading and residency sequence", () => {
    const lifecycle = new TileLifecycle();
    lifecycle.transition("2/1/1", "Queued");
    lifecycle.transition("2/1/1", "Loading");
    lifecycle.transition("2/1/1", "Decoding");
    lifecycle.transition("2/1/1", "Ready");
    lifecycle.transition("2/1/1", "Resident");
    expect(lifecycle.get("2/1/1")).toBe("Resident");
    expect(() => lifecycle.transition("2/1/1", "Loading")).toThrow();
  });

  it("supports retry after a failed generation", () => {
    const lifecycle = new TileLifecycle();
    lifecycle.transition("2/1/1", "Queued");
    lifecycle.transition("2/1/1", "Loading");
    lifecycle.transition("2/1/1", "Failed");
    expect(lifecycle.failureCount("2/1/1")).toBe(1);
    lifecycle.transition("2/1/1", "Queued");
    expect(lifecycle.get("2/1/1")).toBe("Queued");
  });
});

describe("priority scheduler", () => {
  it("runs higher-priority queued work first", async () => {
    const scheduler = new PriorityScheduler(1);
    const order: string[] = [];
    let finishFirst: (() => void) | undefined;
    scheduler.enqueue("first", 1, () => new Promise<void>((resolve) => {
      finishFirst = resolve;
      order.push("first");
    }));
    scheduler.enqueue("low", 2, async () => { order.push("low"); });
    scheduler.enqueue("high", 10, async () => { order.push("high"); });
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(order).toEqual(["first", "high", "low"]);
    scheduler.dispose();
  });

  it("removes cancelled queued jobs without leaving them in the queue", async () => {
    const scheduler = new PriorityScheduler(1);
    let finish: (() => void) | undefined;
    scheduler.enqueue("active", 10, () => new Promise<void>((resolve) => { finish = resolve; }));
    scheduler.enqueue("obsolete", 1, async () => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(scheduler.cancelWhere(new Set(["active"]))).toEqual(["obsolete"]);
    finish?.();
    scheduler.dispose();
  });
});

describe("LRU cache", () => {
  it("updates access recency and exposes oldest entries first", async () => {
    const cache = new LruCache<number>();
    cache.set("a", 1, 4);
    await new Promise((resolve) => setTimeout(resolve, 2));
    cache.set("b", 2, 4);
    cache.get("a");
    expect(cache.oldestFirst()[0][0]).toBe("b");
  });
});