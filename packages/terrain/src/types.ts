import type * as THREE from "three";

export interface TerrainRequest {
  tileId: string;
  bounds: { south: number; west: number; north: number; east: number };
  origin: { latitude: number; longitude: number; height: number };
  segments: number;
}

export interface TerrainPayload {
  tileId: string;
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export interface TerrainProvider {
  generate(request: TerrainRequest, signal: AbortSignal): Promise<TerrainPayload>;
  activeWorkers(): number;
  dispose(): void;
}

export type GeometryResource = THREE.BufferGeometry;