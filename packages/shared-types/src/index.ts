export interface GeographicCoordinate {
  latitude: number;
  longitude: number;
  height: number;
}

export interface TileBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface TileMetadata {
  id: string;
  parentId: string | null;
  childIds: readonly string[];
  bounds: TileBounds;
  level: number;
  approximateAssetBytes: number;
  state: string;
  lastRequestedAt: number;
}