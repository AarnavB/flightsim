export interface CacheEntry<T> {
  value: T;
  lastUsedAt: number;
  bytes: number;
}

export class LruCache<T> {
  private readonly entriesMap = new Map<string, CacheEntry<T>>();

  set(id: string, value: T, bytes: number): void {
    this.entriesMap.set(id, { value, bytes, lastUsedAt: Date.now() });
  }

  get(id: string): T | undefined {
    const entry = this.entriesMap.get(id);
    if (!entry) return undefined;
    entry.lastUsedAt = Date.now();
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