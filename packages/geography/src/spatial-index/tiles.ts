import type { GeographicCoordinate, TileBounds } from "@flightsim/shared-types";

export interface TileAddress {
  level: number;
  x: number;
  y: number;
}

export const MAX_TILE_LEVEL = 24;

export function parseTileId(id: string): TileAddress {
  const match = /^(\d+)\/(\d+)\/(\d+)$/.exec(id);
  if (!match) throw new RangeError("Invalid tile ID: " + id);
  const level = Number(match[1]);
  const x = Number(match[2]);
  const y = Number(match[3]);
  if (!Number.isSafeInteger(level) || level < 0 || level > MAX_TILE_LEVEL) {
    throw new RangeError("Tile level is outside the supported hierarchy.");
  }
  const count = 2 ** level;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x < 0 || y < 0 || x >= count || y >= count) {
    throw new RangeError("Tile address is outside the supported hierarchy.");
  }
  return { level, x, y };
}

export function tileId(address: TileAddress): string {
  const candidate = address.level + "/" + address.x + "/" + address.y;
  parseTileId(candidate);
  return candidate;
}

export function tileBounds(addressOrId: TileAddress | string): TileBounds {
  const address = typeof addressOrId === "string" ? parseTileId(addressOrId) : addressOrId;
  parseTileId(tileId(address));
  const count = 2 ** address.level;
  return {
    south: -90 + address.y * 180 / count,
    north: -90 + (address.y + 1) * 180 / count,
    west: -180 + address.x * 360 / count,
    east: -180 + (address.x + 1) * 360 / count
  };
}

export function tileForCoordinate(coordinate: GeographicCoordinate, level: number): string {
  if (!Number.isInteger(level) || level < 0 || level > MAX_TILE_LEVEL) {
    throw new RangeError("Invalid tile level.");
  }
  if (!Number.isFinite(coordinate.latitude) || coordinate.latitude < -90 || coordinate.latitude > 90) {
    throw new RangeError("Latitude is outside WGS84 bounds.");
  }
  if (!Number.isFinite(coordinate.longitude)) throw new RangeError("Longitude must be finite.");

  const longitude = ((coordinate.longitude + 180) % 360 + 360) % 360 - 180;
  const count = 2 ** level;
  const latitude = Math.min(89.999999999, Math.max(-90, coordinate.latitude));
  const x = Math.min(count - 1, Math.floor((longitude + 180) / 360 * count));
  const y = Math.min(count - 1, Math.floor((latitude + 90) / 180 * count));
  return tileId({ level, x, y });
}

export function parentTileId(id: string): string | null {
  const address = parseTileId(id);
  if (address.level === 0) return null;
  return tileId({
    level: address.level - 1,
    x: Math.floor(address.x / 2),
    y: Math.floor(address.y / 2)
  });
}

export function tileIdAtLevel(id: string, level: number): string {
  const address = parseTileId(id);
  if (level < 0 || level > address.level) throw new RangeError("Target level must be an ancestor.");
  const shift = address.level - level;
  return tileId({
    level,
    x: Math.floor(address.x / 2 ** shift),
    y: Math.floor(address.y / 2 ** shift)
  });
}

export function childTileIds(id: string): string[] {
  const parent = parseTileId(id);
  if (parent.level >= MAX_TILE_LEVEL) return [];
  const next = parent.level + 1;
  return [
    tileId({ level: next, x: parent.x * 2, y: parent.y * 2 }),
    tileId({ level: next, x: parent.x * 2 + 1, y: parent.y * 2 }),
    tileId({ level: next, x: parent.x * 2, y: parent.y * 2 + 1 }),
    tileId({ level: next, x: parent.x * 2 + 1, y: parent.y * 2 + 1 })
  ];
}

export function neighborTileIds(id: string, radius = 1): string[] {
  const address = parseTileId(id);
  if (!Number.isInteger(radius) || radius < 0 || radius > 8) throw new RangeError("Invalid neighbour radius.");
  const count = 2 ** address.level;
  const results: string[] = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    const y = address.y + dy;
    if (y < 0 || y >= count) continue;
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = (address.x + dx + count) % count;
      const neighbour = tileId({ level: address.level, x, y });
      if (!results.includes(neighbour)) results.push(neighbour);
    }
  }
  return results;
}

export function boundsCenter(bounds: TileBounds): GeographicCoordinate {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
    height: 0
  };
}