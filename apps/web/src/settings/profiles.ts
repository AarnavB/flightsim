export type GraphicsProfileName = "Low" | "Medium" | "High" | "Ultra";

export interface GraphicsProfile {
  name: GraphicsProfileName;
  maxLod: number;
  maxDistance: number;
  maxResidentBytes: number;
  pixelRatio: number;
  terrainSegments: number;
  selectionIntervalMs: number;
  prefetchIntervalMs: number;
  shadows: boolean;
  description: string;
}

const MiB = 1024 * 1024;
export const GRAPHICS_PROFILES: Record<GraphicsProfileName, GraphicsProfile> = {
  Low: {
    name: "Low", maxLod: 6, maxDistance: 130_000, maxResidentBytes: 256 * MiB,
    pixelRatio: 0.8, terrainSegments: 12, selectionIntervalMs: 180,
    prefetchIntervalMs: 500, shadows: false, description: "Reduced detail and conservative residency"
  },
  Medium: {
    name: "Medium", maxLod: 7, maxDistance: 220_000, maxResidentBytes: 512 * MiB,
    pixelRatio: 1, terrainSegments: 18, selectionIntervalMs: 140,
    prefetchIntervalMs: 400, shadows: false, description: "Balanced terrain and render resolution"
  },
  High: {
    name: "High", maxLod: 8, maxDistance: 340_000, maxResidentBytes: 1024 * MiB,
    pixelRatio: 1.5, terrainSegments: 24, selectionIntervalMs: 120,
    prefetchIntervalMs: 320, shadows: true, description: "Higher terrain detail and longer view range"
  },
  Ultra: {
    name: "Ultra", maxLod: 9, maxDistance: 450_000, maxResidentBytes: 1536 * MiB,
    pixelRatio: 2, terrainSegments: 28, selectionIntervalMs: 100,
    prefetchIntervalMs: 250, shadows: true, description: "Maximum configured detail and residency"
  }
};
export const PROFILE_NAMES = Object.keys(GRAPHICS_PROFILES) as GraphicsProfileName[];