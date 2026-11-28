import { C172P_CONFIGURATION, validateAircraftConfiguration, type AircraftConfiguration } from "./aircraft-config";
import { AircraftSystemsManager, type AircraftSystemsSnapshot } from "./aircraft-systems";
import { StartupStateMachine, type StartupGuideSnapshot } from "./startup-state-machine";
import { EnvironmentalSystem } from "./environmental-system";
import { PropulsionSystem } from "./propulsion-system";

export type SpawnPreset = "runway" | "parking" | "airborne";
export interface FlightControls { pitch: number; roll: number; yaw: number; throttle: number; brake: number }
export interface EnvironmentConfiguration {
  temperatureC: number; pressureHpa: number; windEastMps: number; windNorthMps: number; visibilityKm: number;
}
export interface Vec3 { x: number; y: number; z: number }
interface Quaternion { x: number; y: number; z: number; w: number }

export interface FlightSnapshot {
  sequence: number; timestamp: number; position: Vec3; headingDeg: number; pitchDeg: number; bankDeg: number;
  speed: number; throttle: number; powered: boolean; paused: boolean; onGround: boolean; climbRate: number;
  spawn: SpawnPreset; droppedSteps: number; airspeedKts: number; groundSpeedKts: number;
  altitudeFt: number; verticalSpeedFpm: number; angleOfAttackDeg: number; sideslipDeg: number;
  stalled: boolean; densityKgM3: number; temperatureC: number; pressureHpa: number;
  systems: AircraftSystemsSnapshot; startup: StartupGuideSnapshot;
}

export const DEFAULT_ENVIRONMENT: EnvironmentConfiguration = {
  temperatureC: 15, pressureHpa: 1013.25, windEastMps: 0, windNorthMps: 0, visibilityKm: 10
};
const GRAVITY = 9.80665;
const GALLONS_TO_LITRES = 3.785411784;
const METRES_PER_SECOND_TO_KNOTS = 1.943844492;
const METRES_TO_FEET = 3.280839895;
const RAD_TO_DEG = 180 / Math.PI;

const clamp = (value: number, low: number, high: number): number =>
  Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : 0;
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (v: Vec3, k: number): Vec3 => ({ x: v.x * k, y: v.y * k, z: v.z * k });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x
});
const magnitude = (v: Vec3): number => Math.sqrt(dot(v, v));
const multiplyQuaternion = (a: Quaternion, b: Quaternion): Quaternion => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
});
const normaliseQuaternion = (q: Quaternion): Quaternion => {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
};
const axisAngle = (axis: Vec3, angle: number): Quaternion => {
  const half = angle / 2;
  const sine = Math.sin(half);
  return { x: axis.x * sine, y: axis.y * sine, z: axis.z * sine, w: Math.cos(half) };
};
const rotate = (q: Quaternion, v: Vec3): Vec3 => {
  const u = { x: q.x, y: q.y, z: q.z };
  const t = scale(cross(u, v), 2);
  return add(v, add(scale(t, q.w), cross(u, t)));
};
const inverseRotate = (q: Quaternion, v: Vec3): Vec3 =>
  rotate({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v);
const orientationFromAttitude = (heading: number, pitch: number, roll: number): Quaternion =>
  normaliseQuaternion(multiplyQuaternion(
    axisAngle({ x: 0, y: 0, z: 1 }, heading),
    multiplyQuaternion(axisAngle({ x: 0, y: 1, z: 0 }, pitch), axisAngle({ x: 1, y: 0, z: 0 }, roll))
  ));
const attitudeFromOrientation = (q: Quaternion) => {
  const roll = Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
  const pitch = Math.asin(clamp(2 * (q.w * q.y - q.z * q.x), -1, 1));
  const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
  return { roll, pitch, heading: (yaw + Math.PI * 2) % (Math.PI * 2) };
};
const nedToRender = (v: Vec3): Vec3 => ({ x: v.y, y: -v.z, z: -v.x });
const renderToNed = (v: Vec3): Vec3 => ({ x: -v.z, y: v.x, z: -v.y });

export class FlightSimulation {
  readonly configuration: AircraftConfiguration;
  systems: AircraftSystemsManager;
  readonly startup = new StartupStateMachine();
  readonly environmentSystem = new EnvironmentalSystem(DEFAULT_ENVIRONMENT);
  readonly propulsion = new PropulsionSystem();
  get environment(): EnvironmentConfiguration { return this.environmentSystem.getSnapshot(); }
  get paused(): boolean { return this.pausedState; }
  private controls: FlightControls = { pitch: 0, roll: 0, yaw: 0, throttle: 0, brake: 0 };
  private position: Vec3;
  private bodyVelocity: Vec3;
  private orientation: Quaternion = orientationFromAttitude(0, 0, 0);
  private angularVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  private pausedState = false;
  private sequence = 0;
  private droppedSteps = 0;
  private spawn: SpawnPreset = "runway";

  constructor(configuration: AircraftConfiguration = C172P_CONFIGURATION, spawn: SpawnPreset = "runway") {
    const configurationErrors = validateAircraftConfiguration(configuration);
    if (configurationErrors.length > 0) throw new Error("Invalid aircraft configuration: " + configurationErrors.join(" "));
    this.configuration = configuration;
    this.systems = new AircraftSystemsManager(configuration);
    this.position = { x: 0, y: 1.4, z: 420 };
    this.bodyVelocity = { x: 0, y: 0, z: 0 };
    this.setSpawn(spawn);
  }

  setControls(controls: Partial<FlightControls>): void {
    this.controls = {
      pitch: clamp(controls.pitch ?? this.controls.pitch, -1, 1),
      roll: clamp(controls.roll ?? this.controls.roll, -1, 1),
      yaw: clamp(controls.yaw ?? this.controls.yaw, -1, 1),
      throttle: clamp(controls.throttle ?? this.controls.throttle, 0, 1),
      brake: clamp(controls.brake ?? this.controls.brake, 0, 1)
    };
  }

  setEnvironment(next: Partial<EnvironmentConfiguration>): void {
    this.environmentSystem.configure(next);
  }

  setDroppedSteps(value: number): void { this.droppedSteps = Math.max(0, Math.floor(value)); }
  setPaused(paused: boolean): void { this.pausedState = paused; }
  togglePaused(): void { this.pausedState = !this.pausedState; }
  toggleMaster(): void { this.systems.toggleMaster(); }
  toggleAlternator(): void { this.systems.toggleAlternator(); }
  toggleFuel(): void { this.systems.toggleFuel(); }
  toggleIgnition(): void { this.systems.toggleIgnition(); }
  toggleAvionics(): void { this.systems.toggleAvionics(); }
  requestEngineStart(): boolean { return this.systems.requestEngineStart(); }
  requestApuStart(): boolean { return this.systems.requestApuStart(); }
  shutdownApu(): void { this.systems.shutdownApu(); }
  shutdownEngines(): void { this.systems.shutdownEngines(); }
  injectEngineFailure(index = 0): void { this.systems.injectEngineFailure(index); }
  injectApuFailure(): void { this.systems.injectApuFailure(); }
  togglePower(): void { this.toggleMaster(); }

  setSpawn(preset: SpawnPreset): void {
    this.systems = new AircraftSystemsManager(this.configuration);
    this.pausedState = false;
    this.spawn = preset;
    this.position = preset === "parking" ? { x: 42, y: 1.4, z: 420 } :
      preset === "airborne" ? { x: 0, y: 170, z: 0 } : { x: 0, y: 1.4, z: 420 };
    this.bodyVelocity = preset === "airborne" ? { x: 46, y: 0, z: 4.2 } : { x: 0, y: 0, z: 0 };
    this.orientation = orientationFromAttitude(0, preset === "airborne" ? 0.04 : 0, 0);
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.controls = { pitch: 0, roll: 0, yaw: 0, throttle: 0, brake: 0 };
    this.sequence = 0;
  }

  reset(): void {
    this.pausedState = false;
    this.droppedSteps = 0;
    this.setSpawn(this.spawn);
  }

  step(dt: number): void {
    if (this.pausedState || !Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, 1 / 60);
    this.systems.update(step, this.controls.throttle);

    const config = this.configuration;
    const density = this.environmentSystem.densityKgM3;
    const environment = this.environmentSystem.getSnapshot();
    const windRender = { x: environment.windEastMps, y: 0, z: -environment.windNorthMps };
    const windNed = renderToNed(windRender);
    const windBody = inverseRotate(this.orientation, windNed);
    const airVelocity = add(this.bodyVelocity, scale(windBody, -1));
    const airspeed = magnitude(airVelocity);
    const safeAirspeed = Math.max(0.1, airspeed);
    const alpha = Math.atan2(airVelocity.z, Math.max(0.1, airVelocity.x));
    const beta = Math.asin(clamp(airVelocity.y / safeAirspeed, -1, 1));
    const qbar = 0.5 * density * airspeed * airspeed;
    const aspectRatio = config.aspectRatio;
    const rawCl = 5.1 * alpha;
    const stallAlpha = 0.27;
    const stallBlend = clamp((Math.abs(alpha) - stallAlpha) / 0.22, 0, 1);
    const cl = clamp(rawCl, -0.85, 1.35) * (1 - 0.38 * stallBlend);
    const inducedDrag = cl * cl / (Math.PI * 0.82 * aspectRatio);
    const parasiteDrag = 0.032;
    const cd = parasiteDrag + inducedDrag + stallBlend * 0.12;
    const dragMagnitude = qbar * config.wingAreaM2 * cd;
    const liftMagnitude = qbar * config.wingAreaM2 * cl;
    const sideMagnitude = -beta * qbar * config.wingAreaM2 * 0.72;
    const aerodynamic = add(
      scale(airVelocity, -dragMagnitude / safeAirspeed),
      { x: 0, y: sideMagnitude, z: -liftMagnitude }
    );

    const engineState = this.systems.engine;
    const engine = {
      state: engineState.state,
      powerW: engineState.state === "running" ? config.engine.maximumPowerW * engineState.powerFraction : 0
    };
    const thrust = this.propulsion.calculateThrust(config, engine, airspeed);
    const groundFriction = this.position.y <= 1.401 ? Math.sign(this.bodyVelocity.x) * (28 + this.controls.brake * 1_900) : 0;
    const controlAuthority = clamp(qbar / 850, 0, 1.25);
    const elevator = this.controls.pitch * 0.32;
    const aileron = this.controls.roll * 0.30;
    const rudder = this.controls.yaw * 0.28;
    const p = this.angularVelocity.x;
    const q = this.angularVelocity.y;
    const r = this.angularVelocity.z;
    const rollMoment = qbar * config.wingAreaM2 * config.wingSpanM *
      (0.075 * aileron - 0.08 * beta - 0.22 * p);
    const pitchMoment = qbar * config.wingAreaM2 * config.meanChordM *
      (0.065 * elevator - 0.92 * alpha - 0.48 * q);
    const yawMoment = qbar * config.wingAreaM2 * config.wingSpanM *
      (0.032 * rudder - 0.14 * beta - 0.30 * r);
    const inertia = config.inertiaKgM2;
    const angularAcceleration = {
      x: (rollMoment + (inertia.pitch - inertia.yaw) * q * r) / inertia.roll,
      y: (pitchMoment + (inertia.yaw - inertia.roll) * p * r) / inertia.pitch,
      z: (yawMoment + (inertia.roll - inertia.pitch) * p * q) / inertia.yaw
    };
    this.angularVelocity = add(this.angularVelocity, scale(angularAcceleration, step * controlAuthority));

    const angularQuaternion: Quaternion = {
      x: this.angularVelocity.x, y: this.angularVelocity.y, z: this.angularVelocity.z, w: 0
    };
    const qdot = multiplyQuaternion(this.orientation, angularQuaternion);
    this.orientation = normaliseQuaternion({
      x: this.orientation.x + 0.5 * qdot.x * step,
      y: this.orientation.y + 0.5 * qdot.y * step,
      z: this.orientation.z + 0.5 * qdot.z * step,
      w: this.orientation.w + 0.5 * qdot.w * step
    });

    const gravityBody = inverseRotate(this.orientation, { x: 0, y: 0, z: GRAVITY });
    const coriolis = cross(this.angularVelocity, this.bodyVelocity);
    const forceBody = add(aerodynamic, { x: thrust - groundFriction, y: 0, z: 0 });
    const acceleration = add(
      scale(forceBody, 1 / config.massKg),
      add(gravityBody, scale(coriolis, -1))
    );
    this.bodyVelocity = add(this.bodyVelocity, scale(acceleration, step));

    const velocityNed = rotate(this.orientation, this.bodyVelocity);
    const velocityRender = nedToRender(velocityNed);
    this.position = add(this.position, scale(velocityRender, step));
    if (this.position.y <= 1.4) {
      this.position.y = 1.4;
      const velocityAfterContact = inverseRotate(this.orientation, velocityNed);
      this.bodyVelocity = { x: velocityAfterContact.x, y: velocityAfterContact.y, z: 0 };
      this.angularVelocity = scale(this.angularVelocity, 0.94);
    }
    this.sequence += 1;
  }

  getSnapshot(timestamp = performance.now()): FlightSnapshot {
    const systems = this.systems.getSnapshot();
    const attitude = attitudeFromOrientation(this.orientation);
    const environment = this.environmentSystem.getSnapshot();
    const density = this.environmentSystem.densityKgM3;
    const windRender = { x: environment.windEastMps, y: 0, z: -environment.windNorthMps };
    const airVelocity = add(this.bodyVelocity, scale(inverseRotate(this.orientation, renderToNed(windRender)), -1));
    const airspeedMps = magnitude(airVelocity);
    const velocityRender = nedToRender(rotate(this.orientation, this.bodyVelocity));
    const groundSpeed = magnitude(velocityRender);
    const alpha = Math.atan2(airVelocity.z, Math.max(0.1, airVelocity.x));
    const beta = Math.asin(clamp(airVelocity.y / Math.max(0.1, airspeedMps), -1, 1));
    const stalled = Math.abs(alpha) > 0.27 && airspeedMps > 12;
    return {
      sequence: this.sequence, timestamp,
      position: { ...this.position },
      headingDeg: attitude.heading * RAD_TO_DEG,
      pitchDeg: attitude.pitch * RAD_TO_DEG,
      bankDeg: attitude.roll * RAD_TO_DEG,
      speed: groundSpeed, throttle: this.controls.throttle,
      powered: systems.engine.state === "running", paused: this.pausedState,
      onGround: this.position.y <= 1.401, climbRate: velocityRender.y,
      spawn: this.spawn, droppedSteps: this.droppedSteps,
      airspeedKts: airspeedMps * METRES_PER_SECOND_TO_KNOTS * Math.sqrt(density / 1.225),
      groundSpeedKts: groundSpeed * METRES_PER_SECOND_TO_KNOTS,
      altitudeFt: this.position.y * METRES_TO_FEET,
      verticalSpeedFpm: velocityRender.y * METRES_TO_FEET * 60,
      angleOfAttackDeg: alpha * RAD_TO_DEG,
      sideslipDeg: beta * RAD_TO_DEG, stalled, densityKgM3: density,
      temperatureC: environment.temperatureC, pressureHpa: environment.pressureHpa,
      systems, startup: this.startup.evaluate(systems)
    };
  }
}

export { GALLONS_TO_LITRES };
