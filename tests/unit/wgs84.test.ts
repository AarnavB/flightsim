import { describe, expect, it } from "vitest";
import {
  ecefToGeodetic,
  geodeticToEcef,
  LocalTangentFrame,
  normalizeLongitude,
  validateCoordinate
} from "../../packages/geography/src/index";

describe("WGS84 coordinate transforms", () => {
  it("normalises longitudes across the antimeridian", () => {
    expect(normalizeLongitude(181)).toBe(-179);
    expect(normalizeLongitude(540)).toBe(-180);
    expect(normalizeLongitude(-540)).toBe(-180);
  });

  it("round-trips geodetic and ECEF coordinates", () => {
    const original = { latitude: 37.6213, longitude: -122.379, height: 1240 };
    const result = ecefToGeodetic(...geodeticToEcef(original));
    expect(result.latitude).toBeCloseTo(original.latitude, 7);
    expect(result.longitude).toBeCloseTo(original.longitude, 7);
    expect(result.height).toBeCloseTo(original.height, 2);
  });

  it("round-trips local ENU coordinates near the dateline", () => {
    const frame = new LocalTangentFrame({ latitude: 37, longitude: 179.8, height: 0 });
    const local = frame.toRender({ latitude: 37.01, longitude: -179.9, height: 920 });
    const geo = frame.fromRender(...local);
    expect(geo.latitude).toBeCloseTo(37.01, 6);
    expect(geo.longitude).toBeCloseTo(-179.9, 6);
    expect(geo.height).toBeCloseTo(920, 1);
  });

  it("rejects invalid latitude and non-finite values", () => {
    expect(() => geodeticToEcef({ latitude: 91, longitude: 0, height: 0 })).toThrow(RangeError);
    expect(() => validateCoordinate({ latitude: 0, longitude: Infinity, height: 0 })).toThrow(RangeError);
  });

  it("handles the polar ECEF edge case", () => {
    const result = ecefToGeodetic(...geodeticToEcef({ latitude: 90, longitude: 45, height: 50 }));
    expect(result.latitude).toBeCloseTo(90, 6);
    expect(result.height).toBeCloseTo(50, 2);
  });
});