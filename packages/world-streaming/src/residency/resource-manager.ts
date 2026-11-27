import type * as THREE from "three";

interface ResourceRecord {
  geometry: THREE.BufferGeometry;
  cpuBytes: number;
  gpuBytes: number;
  references: number;
  lastUsedAt: number;
}

/** Tracks only resources owned by the renderer; GPU bytes are estimates, not hardware telemetry. */
export class ResourceManager {
  private readonly records = new Map<string, ResourceRecord>();
  private budgetBytes: number;
  private textureBytes = 0;

  constructor(budgetBytes: number) {
    this.budgetBytes = budgetBytes;
  }

  setBudget(bytes: number): void {
    this.budgetBytes = Math.max(16 * 1024 * 1024, bytes);
  }

  track(id: string, geometry: THREE.BufferGeometry, cpuBytes: number, gpuBytes: number): void {
    this.dispose(id);
    this.records.set(id, {
      geometry,
      cpuBytes,
      gpuBytes,
      references: 0,
      lastUsedAt: Date.now()
    });
  }

  touch(id: string): void {
    const record = this.records.get(id);
    if (record) record.lastUsedAt = Date.now();
  }

  setReferences(ids: ReadonlySet<string>): void {
    for (const [id, record] of this.records) {
      record.references = ids.has(id) ? 1 : 0;
      if (record.references > 0) record.lastUsedAt = Date.now();
    }
  }

  dispose(id: string): void {
    const record = this.records.get(id);
    if (!record) return;
    record.geometry.dispose();
    this.records.delete(id);
  }

  evictToBudget(protectedIds: ReadonlySet<string>): string[] {
    const evicted: string[] = [];
    while (this.geometryMemoryBytes > this.budgetBytes) {
      const candidate = [...this.records.entries()]
        .filter(([id, record]) => record.references === 0 && !protectedIds.has(id))
        .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt)[0];
      if (!candidate) break;
      evicted.push(candidate[0]);
      this.dispose(candidate[0]);
    }
    return evicted;
  }

  evictOlderThan(timestamp: number, protectedIds: ReadonlySet<string>): string[] {
    const evicted: string[] = [];
    for (const [id, record] of [...this.records]) {
      if (record.references === 0 && !protectedIds.has(id) && record.lastUsedAt < timestamp) {
        evicted.push(id);
        this.dispose(id);
      }
    }
    return evicted;
  }

  get geometryMemoryBytes(): number {
    let total = 0;
    for (const record of this.records.values()) total += record.gpuBytes;
    return total;
  }

  get cpuMemoryBytes(): number {
    let total = 0;
    for (const record of this.records.values()) total += record.cpuBytes;
    return total;
  }

  get textureMemoryBytes(): number { return this.textureBytes; }
  get count(): number { return this.records.size; }
  get memoryBudgetBytes(): number { return this.budgetBytes; }

  disposeAll(): void {
    for (const id of [...this.records.keys()]) this.dispose(id);
  }
}