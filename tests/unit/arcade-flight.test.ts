import { describe, expect, it } from "vitest";
import { APU_DEMONSTRATION_CONFIGURATION, C172P_CONFIGURATION, validateAircraftConfiguration } from "../../apps/web/src/simulation/aircraft-config";
import { FlightSimulation } from "../../apps/web/src/simulation/flight-simulation";
import { FixedStepClock } from "../../apps/web/src/simulation/fixed-step-clock";

function prepareEngine(simulation: FlightSimulation): void {
  simulation.toggleMaster();
  simulation.toggleFuel();
  simulation.toggleIgnition();
  simulation.step(1 / 120);
  expect(simulation.requestEngineStart()).toBe(true);
  for (let i = 0; i < 360; i += 1) simulation.step(1 / 120);
}

describe("Stage 3 flight simulation core", () => {
  it("validates the C172P profile as a single-engine, no-APU aircraft", () => {
    expect(validateAircraftConfiguration(C172P_CONFIGURATION)).toEqual([]);
    expect(C172P_CONFIGURATION.engine.count).toBe(1);
    expect(C172P_CONFIGURATION.engine.model).toContain("O-320-D2J");
    expect(C172P_CONFIGURATION.engine.propeller).toBe("fixed-pitch");
    expect(C172P_CONFIGURATION.hasApu).toBe(false);
  });

  it("supports an optional APU profile without attaching one to the C172P", () => {
    expect(validateAircraftConfiguration(APU_DEMONSTRATION_CONFIGURATION)).toEqual([]);
    const demo = new FlightSimulation(APU_DEMONSTRATION_CONFIGURATION);
    expect(demo.getSnapshot().systems.apu?.state).toBe("off");
    expect(demo.getSnapshot().systems.engines).toHaveLength(2);
    demo.requestApuStart();
    demo.step(1 / 120);
    expect(demo.getSnapshot().systems.apu?.state).toBe("available");
    expect(new FlightSimulation().getSnapshot().systems.apu).toBeNull();
    expect(new FlightSimulation().getSnapshot().systems.engines).toHaveLength(1);
  });

  it("blocks an engine-start request when electrical, fuel or ignition dependencies are absent", () => {
    const simulation = new FlightSimulation();
    expect(simulation.requestEngineStart()).toBe(false);
    expect(simulation.getSnapshot().startup.blockedReason).toBeTruthy();
    simulation.toggleMaster();
    simulation.step(1 / 120);
    expect(simulation.requestEngineStart()).toBe(false);
    expect(simulation.getSnapshot().startup.blockedReason).toContain("fuel");
  });

  it("transitions the engine only after simulated dependencies become available", () => {
    const simulation = new FlightSimulation();
    prepareEngine(simulation);
    const snapshot = simulation.getSnapshot();
    expect(snapshot.systems.engine.state).toBe("running");
    expect(snapshot.systems.engine.rpm).toBeGreaterThan(0);
    expect(snapshot.systems.electrical.busPowered).toBe(true);
    expect(snapshot.systems.avionics.powered).toBe(true);
    expect(snapshot.startup.phase).toBe("ready");
    expect(snapshot.startup.progress).toBe(100);
  });

  it("exposes deterministic simulated engine-failure and shutdown states", () => {
    const simulation = new FlightSimulation();
    prepareEngine(simulation);
    simulation.injectEngineFailure();
    simulation.step(1 / 120);
    expect(simulation.getSnapshot().systems.engine.state).toBe("failed");
    expect(simulation.getSnapshot().systems.engine.warning).toContain("failure");
    simulation.shutdownEngines();
    expect(simulation.getSnapshot().systems.engine.state).toBe("off");
  });

  it("propagates fuel and ignition interruptions into an unstable engine state", () => {
    const simulation = new FlightSimulation();
    prepareEngine(simulation);
    simulation.toggleFuel();
    simulation.step(1 / 120);
    expect(simulation.getSnapshot().systems.engine.state).toBe("unstable");
    expect(simulation.getSnapshot().systems.engine.warning).toContain("fuel");
  });

  it("makes avionics availability depend on the electrical bus", () => {
    const simulation = new FlightSimulation();
    simulation.toggleMaster();
    simulation.step(1 / 120);
    expect(simulation.getSnapshot().systems.avionics.powered).toBe(true);
    simulation.toggleMaster();
    simulation.toggleAlternator();
    simulation.step(1 / 120);
    expect(simulation.getSnapshot().systems.electrical.busPowered).toBe(false);
    expect(simulation.getSnapshot().systems.avionics.powered).toBe(false);
  });

  it("consumes fuel from the simulated engine state and throttle", () => {
    const simulation = new FlightSimulation();
    prepareEngine(simulation);
    const fuelBefore = simulation.getSnapshot().systems.fuel.quantityGallons;
    simulation.setControls({ throttle: 0.7 });
    for (let i = 0; i < 1_800; i += 1) simulation.step(1 / 120);
    const snapshot = simulation.getSnapshot();
    expect(snapshot.systems.fuel.quantityGallons).toBeLessThan(fuelBefore);
    expect(snapshot.systems.fuel.flowGph).toBeGreaterThan(0);
    expect(snapshot.systems.engine.powerW).toBeGreaterThan(0);
  });

  it("integrates control moments into attitude without assigning attitude from keys", () => {
    const simulation = new FlightSimulation();
    simulation.setSpawn("airborne");
    const before = simulation.getSnapshot();
    simulation.setControls({ pitch: 0.5, roll: 0.55, yaw: 0.2 });
    for (let i = 0; i < 240; i += 1) simulation.step(1 / 120);
    const after = simulation.getSnapshot();
    expect(Number.isFinite(after.headingDeg)).toBe(true);
    expect(Number.isFinite(after.pitchDeg)).toBe(true);
    expect(after.bankDeg).not.toBe(before.bankDeg);
    expect(after.position).not.toEqual(before.position);
  });

  it("publishes atmosphere-derived density and responds to environmental changes", () => {
    const simulation = new FlightSimulation();
    const seaLevelDensity = simulation.getSnapshot().densityKgM3;
    simulation.setEnvironment({ temperatureC: 35, pressureHpa: 980, windEastMps: 8 });
    const warmDensity = simulation.getSnapshot().densityKgM3;
    expect(warmDensity).toBeLessThan(seaLevelDensity);
    expect(simulation.getSnapshot().temperatureC).toBe(35);
  });

  it("holds state while paused and resets aircraft and systems coherently", () => {
    const simulation = new FlightSimulation();
    prepareEngine(simulation);
    simulation.setPaused(true);
    const before = simulation.getSnapshot();
    simulation.step(1 / 120);
    expect(simulation.getSnapshot().position).toEqual(before.position);
    simulation.reset();
    const reset = simulation.getSnapshot();
    expect(reset.paused).toBe(false);
    expect(reset.systems.engine.state).toBe("off");
    expect(reset.systems.electrical.masterOn).toBe(false);
    expect(reset.systems.fuel.valveOpen).toBe(false);
    expect(reset.position).toEqual({ x: 0, y: 1.4, z: 420 });
  });
});

describe("fixed-step clock", () => {
  it("clamps frame gaps, bounds catch-up work and reports dropped steps", () => {
    const clock = new FixedStepClock();
    const applied: number[] = [];
    const result = clock.advance(0.5, step => applied.push(step));
    expect(result.clampedDelta).toBeCloseTo(0.12);
    expect(result.steps).toBe(12);
    expect(applied).toHaveLength(12);
    expect(result.droppedThisFrame).toBe(2);
    expect(result.totalDroppedSteps).toBe(2);
    expect(clock.droppedSteps).toBe(2);
  });

  it("clears paused-time accumulation and resets dropped-step counters", () => {
    const clock = new FixedStepClock();
    clock.advance(0.04, () => undefined);
    clock.clearAccumulator();
    expect(clock.advance(0, () => undefined).steps).toBe(0);
    clock.reset();
    expect(clock.droppedSteps).toBe(0);
  });
});
