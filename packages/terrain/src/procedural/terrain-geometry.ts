import { LocalTangentFrame } from "@flightsim/geography";
import type { GeographicCoordinate, TileBounds } from "@flightsim/shared-types";
import type { TerrainPayload, TerrainRequest } from "../types";

/** Deterministic global-coordinate development fixture; not real elevation data. */
export function sampleProceduralElevation(latitude: number, longitude: number): number {
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  const continental = Math.sin(lat * 3.7) * Math.cos(lon * 2.4);
  const ridges = Math.sin(lat * 18 + Math.sin(lon * 8) * 1.7) * Math.cos(lon * 13);
  const detail = Math.sin(lat * 43 + lon * 29) * Math.cos(lon * 37 - lat * 11);
  return 420 + continental * 760 + ridges * 380 + detail * 95;
}

export function buildTerrainPayload(request: TerrainRequest): TerrainPayload {
  const segments = Math.max(4, Math.min(48, Math.floor(request.segments)));
  const frame = new LocalTangentFrame(request.origin as GeographicCoordinate);
  const bounds = request.bounds as TileBounds;
  const { south, west, north, east } = bounds;
  const side = segments + 1;
  const gridCount = side * side;
  const boundaryCount = side * 4;
  const positions = new Float32Array((gridCount + boundaryCount) * 3);
  const uvs = new Float32Array((gridCount + boundaryCount) * 2);
  const indices: number[] = [];

  for (let row = 0; row <= segments; row += 1) {
    const latitude = south + (north - south) * row / segments;
    for (let column = 0; column <= segments; column += 1) {
      const longitude = west + (east - west) * column / segments;
      const height = sampleProceduralElevation(latitude, longitude);
      const [x, y, z] = frame.toRender({ latitude, longitude, height });
      const index = row * side + column;
      positions.set([x, y, z], index * 3);
      uvs.set([column / segments, row / segments], index * 2);

      if (row < segments && column < segments) {
        const a = index;
        const b = index + 1;
        const c = index + side;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  // Boundary skirts soften transitions while adjacent LOD levels have different sample density.
  let skirtIndex = gridCount;
  const edges = [
    Array.from({ length: side }, (_, i) => i),
    Array.from({ length: side }, (_, i) => segments * side + i),
    Array.from({ length: side }, (_, i) => i * side),
    Array.from({ length: side }, (_, i) => i * side + segments)
  ];

  for (const edge of edges) {
    const skirtVertices: number[] = [];
    for (const original of edge) {
      const offset = original * 3;
      const skirt = skirtIndex++;
      positions.set(
        [positions[offset], positions[offset + 1] - 90, positions[offset + 2]],
        skirt * 3
      );
      uvs.set([uvs[original * 2], uvs[original * 2 + 1]], skirt * 2);
      skirtVertices.push(skirt);
    }
    for (let i = 0; i < edge.length - 1; i += 1) {
      indices.push(
        edge[i], skirtVertices[i], edge[i + 1],
        edge[i + 1], skirtVertices[i], skirtVertices[i + 1]
      );
    }
  }

  return {
    tileId: request.tileId,
    positions,
    uvs,
    indices: new Uint32Array(indices)
  };
}

export function sharedBoundarySamples(
  bounds: TileBounds,
  segments: number,
  edge: "north" | "south" | "east" | "west"
): number[] {
  const values: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    if (edge === "north" || edge === "south") {
      const latitude = edge === "north" ? bounds.north : bounds.south;
      const longitude = bounds.west + (bounds.east - bounds.west) * i / segments;
      values.push(sampleProceduralElevation(latitude, longitude));
    } else {
      const longitude = edge === "east" ? bounds.east : bounds.west;
      const latitude = bounds.south + (bounds.north - bounds.south) * i / segments;
      values.push(sampleProceduralElevation(latitude, longitude));
    }
  }
  return values;
}