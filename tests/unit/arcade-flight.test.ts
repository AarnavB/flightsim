import { describe, expect, it } from "vitest";
import { ArcadeFlightModel, createArcadeSpawn } from "../../apps/web/src/simulation/arcade-flight";

describe("arcade flight game model", () => {
  it("creates distinct, deterministic game spawn presets", () => {
    expect(createArcadeSpawn("runway").onGround).toBe(true);
    expect(createArcadeSpawn("parking").powered).toBe(false);
    expect(createArcadeSpawn("airborne").position.y).toBe(170);
    expect(createArcadeSpawn("airborne").speed).toBe(46);
  });

  it("responds to throttle without depending on a render loop", () => {
    const model = new ArcadeFlightModel("runway");
    model.setControls({ throttle: 1 });
    for (let i = 0; i < 180; i += 1) model.step(1 / 60);
    expect(model.getSnapshot().speed).toBeGreaterThan(0);
  });

  it("holds its state while paused", () => {
    const model = new ArcadeFlightModel("airborne");
    model.setPaused(true);
    const before = model.getSnapshot();
    for (let i = 0; i < 120; i += 1) model.step(1 / 60);
    expect(model.getSnapshot().position).toEqual(before.position);
  });

  it("resets cleanly and clamps invalid control values", () => {
    const model = new ArcadeFlightModel("parking");
    model.setControls({ pitch: Number.NaN, roll: 8, throttle: 3 });
    model.reset();
    const state = model.getSnapshot();
    expect(state.spawn).toBe("parking");
    expect(state.position.x).toBe(42);
    expect(state.speed).toBe(0);
    expect(state.paused).toBe(false);
  });

  it("keeps game altitude above the simple local floor", () => {
    const model = new ArcadeFlightModel("airborne");
    model.setControls({ pitch: -1, throttle: 0 });
    for (let i = 0; i < 1_200; i += 1) model.step(1 / 60);
    expect(model.getSnapshot().position.y).toBeGreaterThanOrEqual(1.4);
  });
});
