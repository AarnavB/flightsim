import type { TileMetadata } from "@flightsim/shared-types";
import { childTileIds, parentTileId, tileBounds } from "@flightsim/geography";

/** Lazily materialised geographical metadata; never stores a global flat tile catalogue. */
export class TileTree {
  private readonly nodes = new Map<string, TileMetadata>();

  get(id: string): TileMetadata {
    const existing = this.nodes.get(id);
    if (existing) return existing;

    const level = Number(id.split("/")[0]);
    const node: TileMetadata = {
      id,
      parentId: parentTileId(id),
      childIds: [],
      bounds: tileBounds(id),
      level,
      approximateAssetBytes: Math.pow(2, level * 0.25) * 64_000,
      state: "Unloaded",
      lastRequestedAt: 0
    };
    this.nodes.set(id, node);
    return node;
  }

  children(id: string): TileMetadata[] {
    const ids = childTileIds(id);
    const parent = this.get(id);
    if (parent.childIds.length === 0 && ids.length > 0) {
      this.nodes.set(id, { ...parent, childIds: ids });
    }
    return ids.map((childId) => this.get(childId));
  }

  setState(id: string, state: string, requestedAt = Date.now()): void {
    this.nodes.set(id, { ...this.get(id), state, lastRequestedAt: requestedAt });
  }

  get knownNodeCount(): number { return this.nodes.size; }
  clear(): void { this.nodes.clear(); }
}