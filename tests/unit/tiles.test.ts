import { describe, expect, it } from "vitest";
import {
  childTileIds,
  neighborTileIds,
  parentTileId,
  tileBounds,
  tileForCoordinate,
  tileIdAtLevel
} from "../../packages/geography/src/index";

describe("geographic quadtree indexing", () => {
  it("maps both sides of the antimeridian to wrapped tile columns", () => {
    expect(tileForCoordinate({ latitude: 0, longitude: 180, height: 0 }, 4)).toBe("4/0/8");
    expect(tileForCoordinate({ latitude: 0, longitude: -180, height: 0 }, 4)).toBe("4/0/8");
    expect(tileForCoordinate({ latitude: 0, longitude: 181, height: 0 }, 4)).toBe("4/0/8");
  });

  it("creates four children and a reversible parent", () => {
    const children = childTileIds("3/2/4");
    expect(children).toHaveLength(4);
    expect(parentTileId(children[0])).toBe("3/2/4");
  });

  it("resolves ancestor identifiers", () => {
    expect(tileIdAtLevel("4/5/9", 2)).toBe("2/1/2");
  });

  it("wraps horizontal neighbours at the dateline", () => {
    expect(neighborTileIds("2/0/1")).toContain("2/3/1");
  });

  it("keeps root bounds within valid global coordinates", () => {
    const bounds = tileBounds("0/0/0");
    expect(bounds.south).toBe(-90);
    expect(bounds.north).toBe(90);
    expect(bounds.west).toBe(-180);
    expect(bounds.east).toBe(180);
  });

  it("rejects invalid tile IDs", () => {
    expect(() => tileBounds("25/0/0")).toThrow(RangeError);
    expect(() => tileBounds("2/4/0")).toThrow(RangeError);
  });
});