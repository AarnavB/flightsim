import { describe, expect, it } from "vitest";
import {
  buildTerrainPayload,
  sampleProceduralElevation,
  sharedBoundarySamples
} from "../../packages/terrain/src/index";

describe("procedural terrain fixtures", () => {
  const request = {
    tileId: "4/3/7",
    bounds: { south: -11.25, west: -112.5, north: 0, east: -90 },
    origin: { latitude: 0, longitude: 0, height: 0 },
    segments: 8
  };

  it("generates deterministic typed-array geometry", () => {
    const a = buildTerrainPayload(request);
    const b = buildTerrainPayload(request);
    expect(a.positions).toEqual(b.positions);
    expect(a.indices).toEqual(b.indices);
    expect(a.positions.length).toBe((9 * 9 + 9 * 4) * 3);
  });

  it("keeps the underlying terrain function continuous at the antimeridian", () => {
    for (const latitude of [-70, -31.5, 0, 37.6, 80]) {
      expect(sampleProceduralElevation(latitude, -180))
        .toBeCloseTo(sampleProceduralElevation(latitude, 180), 9);
    }
  });

  it("produces matching samples for a shared geographic edge", () => {
    const left = { south: 0, west: 0, north: 10, east: 10 };
    const right = { south: 0, west: 10, north: 10, east: 20 };
    expect(sharedBoundarySamples(left, 12, "east"))
      .toEqual(sharedBoundarySamples(right, 12, "west"));
  });

  it("returns finite elevations", () => {
    expect(Number.isFinite(sampleProceduralElevation(45, -122))).toBe(true);
  });
});