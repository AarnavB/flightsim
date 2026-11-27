export interface CacheEntry<T> {
  value: T;
  lastUsedAt: number;
  bytes: number;
}

/** LRU recency uses a monotonic logical clock so same-millisecond accesses remain ordered. */
export class LruCache<T> {
  private readonly entriesMap = new Map<string, CacheEntry<T>>();
  private logicalClock = 0;

  private tick(): number {
    this.logicalClock = Math.max(Date.now(), this.logicalClock + 1);
    return this.logicalClock;
  }

  set(id: string, value: T, bytes: number): void {
    this.entriesMap.set(id, { value, bytes, lastUsedAt: this.tick() });
  }

  get(id: string): T | undefined {
    const entry = this.entriesMap.get(id);
    if (!entry) return undefined;
    entry.lastUsedAt = this.tick();
    return entry.value;
  }

  peek(id: string): T | undefined { return this.entriesMap.get(id)?.value; }
  delete(id: string): boolean { return this.entriesMap.delete(id); }
  has(id: string): boolean { return this.entriesMap.has(id); }
  get size(): number { return this.entriesMap.size; }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.entriesMap.entries();
  }

  oldestFirst(): Array<[string, CacheEntry<T>]> {
    return [...this.entriesMap.entries()]
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  clear(): void { this.entriesMap.clear(); }
}
