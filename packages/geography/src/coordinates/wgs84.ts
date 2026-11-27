import type { GeographicCoordinate } from "@flightsim/shared-types";

export const WGS84 = {
  semiMajorAxis: 6_378_137,
  flattening: 1 / 298.257223563,
  eccentricitySquared: (1 / 298.257223563) * (2 - 1 / 298.257223563)
} as const;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const semiMinorAxis = WGS84.semiMajorAxis * (1 - WGS84.flattening);
const secondEccentricitySquared =
  (WGS84.semiMajorAxis ** 2 - semiMinorAxis ** 2) / semiMinorAxis ** 2;

export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) throw new RangeError("Longitude must be finite.");
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

export function validateCoordinate(coordinate: GeographicCoordinate): GeographicCoordinate {
  if (!Number.isFinite(coordinate.latitude) || coordinate.latitude < -90 || coordinate.latitude > 90) {
    throw new RangeError("Latitude must be between -90 and 90 degrees.");
  }
  if (!Number.isFinite(coordinate.longitude) || !Number.isFinite(coordinate.height)) {
    throw new RangeError("Longitude and height must be finite.");
  }
  return { ...coordinate, longitude: normalizeLongitude(coordinate.longitude) };
}

export function geodeticToEcef(input: GeographicCoordinate): [number, number, number] {
  const coordinate = validateCoordinate(input);
  const latitude = coordinate.latitude * DEG;
  const longitude = coordinate.longitude * DEG;
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const radius = WGS84.semiMajorAxis /
    Math.sqrt(1 - WGS84.eccentricitySquared * sinLatitude ** 2);

  return [
    (radius + coordinate.height) * cosLatitude * Math.cos(longitude),
    (radius + coordinate.height) * cosLatitude * Math.sin(longitude),
    (radius * (1 - WGS84.eccentricitySquared) + coordinate.height) * sinLatitude
  ];
}

export function ecefToGeodetic(x: number, y: number, z: number): GeographicCoordinate {
  if (![x, y, z].every(Number.isFinite)) throw new RangeError("ECEF coordinates must be finite.");
  const horizontal = Math.hypot(x, y);
  if (horizontal < 1e-9) {
    return { latitude: z >= 0 ? 90 : -90, longitude: 0, height: Math.abs(z) - semiMinorAxis };
  }

  const theta = Math.atan2(z * WGS84.semiMajorAxis, horizontal * semiMinorAxis);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const latitude = Math.atan2(
    z + secondEccentricitySquared * semiMinorAxis * sinTheta ** 3,
    horizontal - WGS84.eccentricitySquared * WGS84.semiMajorAxis * cosTheta ** 3
  );
  const longitude = Math.atan2(y, x);
  const sinLatitude = Math.sin(latitude);
  const radius = WGS84.semiMajorAxis /
    Math.sqrt(1 - WGS84.eccentricitySquared * sinLatitude ** 2);
  const height = Math.abs(Math.cos(latitude)) > 1e-8
    ? horizontal / Math.cos(latitude) - radius
    : z / sinLatitude - radius * (1 - WGS84.eccentricitySquared);

  return {
    latitude: latitude * RAD,
    longitude: normalizeLongitude(longitude * RAD),
    height
  };
}

/**
 * Local tangent frame at a WGS84 origin.
 * Three.js axes: X=east, Y=up, Z=south (negative north).
 */
export class LocalTangentFrame {
  readonly origin: GeographicCoordinate;
  private readonly originEcef: [number, number, number];
  private readonly sinLatitude: number;
  private readonly cosLatitude: number;
  private readonly sinLongitude: number;
  private readonly cosLongitude: number;

  constructor(origin: GeographicCoordinate) {
    this.origin = validateCoordinate(origin);
    this.originEcef = geodeticToEcef(this.origin);
    const latitude = this.origin.latitude * DEG;
    const longitude = this.origin.longitude * DEG;
    this.sinLatitude = Math.sin(latitude);
    this.cosLatitude = Math.cos(latitude);
    this.sinLongitude = Math.sin(longitude);
    this.cosLongitude = Math.cos(longitude);
  }

  toRender(coordinate: GeographicCoordinate): [number, number, number] {
    const ecef = geodeticToEcef(coordinate);
    const dx = ecef[0] - this.originEcef[0];
    const dy = ecef[1] - this.originEcef[1];
    const dz = ecef[2] - this.originEcef[2];

    const east = -this.sinLongitude * dx + this.cosLongitude * dy;
    const north =
      -this.sinLatitude * this.cosLongitude * dx
      - this.sinLatitude * this.sinLongitude * dy
      + this.cosLatitude * dz;
    const up =
      this.cosLatitude * this.cosLongitude * dx
      + this.cosLatitude * this.sinLongitude * dy
      + this.sinLatitude * dz;

    return [east, up, -north];
  }

  fromRender(east: number, up: number, south: number): GeographicCoordinate {
    if (![east, up, south].every(Number.isFinite)) {
      throw new RangeError("Local coordinates must be finite.");
    }
    const north = -south;
    const dx =
      -this.sinLongitude * east
      - this.sinLatitude * this.cosLongitude * north
      + this.cosLatitude * this.cosLongitude * up;
    const dy =
      this.cosLongitude * east
      - this.sinLatitude * this.sinLongitude * north
      + this.cosLatitude * this.sinLongitude * up;
    const dz = this.cosLatitude * north + this.sinLatitude * up;

    return ecefToGeodetic(
      this.originEcef[0] + dx,
      this.originEcef[1] + dy,
      this.originEcef[2] + dz
    );
  }
}