/**
 * Deliberately arcade-only flying-game model.
 * The numbers below are game tuning values, not aircraft performance data.
 * This module is not suitable for flight training or real-world procedures.
 */
export type SpawnPreset = "runway" | "parking" | "airborne";

export interface ArcadeControls {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  brake: number;
}

export interface ArcadeSnapshot {
  sequence: number;
  timestamp: number;
  position: { x: number; y: number; z: number };
  headingDeg: number;
  pitchDeg: number;
  bankDeg: number;
  speed: number;
  throttle: number;
  powered: boolean;
  paused: boolean;
  onGround: boolean;
  climbRate: number;
  spawn: SpawnPreset;
  droppedSteps: number;
}

export const NEUTRAL_ARCADE_CONTROLS: ArcadeControls = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0,
  brake: 0
};

export function clampInput(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

export function createArcadeSpawn(preset: SpawnPreset): ArcadeSnapshot {
  const common = {
    sequence: 0,
    timestamp: 0,
    headingDeg: 0,
    pitchDeg: 0,
    bankDeg: 0,
    throttle: preset === "airborne" ? 0.72 : 0,
    powered: preset !== "parking",
    paused: false,
    onGround: preset !== "airborne",
    climbRate: 0,
    spawn: preset,
    droppedSteps: 0
  } as const;

  if (preset === "parking") {
    return { ...common, position: { x: 42, y: 1.4, z: 420 }, speed: 0 };
  }
  if (preset === "airborne") {
    return { ...common, position: { x: 0, y: 170, z: 0 }, speed: 46 };
  }
  return { ...common, position: { x: 0, y: 1.4, z: 420 }, speed: 0 };
}

/**
 * Game-only simulation. Controls directly shape the plane's game attitude;
 * there is no attempt to reproduce real aerodynamic, engine or stall behaviour.
 */
export class ArcadeFlightModel {
  private controls: ArcadeControls = { ...NEUTRAL_ARCADE_CONTROLS };
  private sequence = 0;
  private snapshot: ArcadeSnapshot;

  constructor(preset: SpawnPreset = "runway") {
    this.snapshot = createArcadeSpawn(preset);
  }

  setControls(next: Partial<ArcadeControls>): void {
    this.controls = {
      pitch: clampInput(next.pitch ?? this.controls.pitch),
      roll: clampInput(next.roll ?? this.controls.roll),
      yaw: clampInput(next.yaw ?? this.controls.yaw),
      throttle: Math.max(0, Math.min(1, Number.isFinite(next.throttle) ? next.throttle! : this.controls.throttle)),
      brake: Math.max(0, Math.min(1, Number.isFinite(next.brake) ? next.brake! : this.controls.brake))
    };
  }

  togglePower(): void {
    this.snapshot.powered = !this.snapshot.powered;
    if (!this.snapshot.powered) this.snapshot.throttle = 0;
  }

  setPaused(paused: boolean): void {
    this.snapshot.paused = paused;
  }

  togglePaused(): void {
    this.snapshot.paused = !this.snapshot.paused;
  }

  spawn(preset: SpawnPreset): void {
    this.snapshot = createArcadeSpawn(preset);
    this.controls = { ...NEUTRAL_ARCADE_CONTROLS };
  }

  reset(): void {
    this.spawn(this.snapshot.spawn);
  }

  step(dt: number): void {
    if (this.snapshot.paused || !Number.isFinite(dt) || dt <= 0) return;
    const s = this.snapshot;
    const c = this.controls;
    const step = Math.min(dt, 1 / 20);

    // Smooth game controls to avoid abrupt keyboard or gamepad changes.
    const attitudeResponse = Math.min(1, step * 3.8);
    const targetPitch = c.pitch * 22;
    const targetBank = c.roll * 46;
    s.pitchDeg += (targetPitch - s.pitchDeg) * attitudeResponse;
    s.bankDeg += (targetBank - s.bankDeg) * attitudeResponse;
    if (s.onGround) {
      s.pitchDeg *= Math.max(0, 1 - step * 2.4);
      s.bankDeg *= Math.max(0, 1 - step * 3.2);
    }

    const targetThrottle = s.powered ? c.throttle : 0;
    s.throttle += (targetThrottle - s.throttle) * Math.min(1, step * 1.8);
    const arcadeAcceleration = s.throttle * 24 - s.speed * 0.42 - c.brake * 38;
    s.speed = Math.max(0, Math.min(78, s.speed + arcadeAcceleration * step));

    const speedFactor = Math.min(1, s.speed / 48);
    const bankTurn = (s.bankDeg / 46) * 34 * speedFactor;
    const headingTurn = bankTurn + c.yaw * 28;
    s.headingDeg = ((s.headingDeg + headingTurn * step) % 360 + 360) % 360;

    const heading = s.headingDeg * Math.PI / 180;
    const pitch = s.pitchDeg * Math.PI / 180;
    s.position.x += Math.sin(heading) * Math.cos(pitch) * s.speed * step;
    s.position.z -= Math.cos(heading) * Math.cos(pitch) * s.speed * step;

    if (s.onGround) {
      s.position.y = 1.4;
      // A deliberately game-like launch threshold, not a real aircraft procedure.
      if (s.powered && s.speed > 31 && s.pitchDeg > 7) s.onGround = false;
      s.climbRate = 0;
    } else {
      // Generic arcade energy curve. It is not a lift/stall equation.
      const energy = Math.min(1.25, s.speed / 54);
      const arcadeVerticalSpeed = Math.sin(pitch) * s.speed * 0.62 + (energy - 0.58) * 7;
      s.climbRate = arcadeVerticalSpeed;
      s.position.y += arcadeVerticalSpeed * step;
      if (s.position.y <= 1.4) {
        s.position.y = 1.4;
        s.onGround = true;
        s.pitchDeg *= 0.2;
        s.bankDeg *= 0.25;
        s.speed *= 0.84;
      }
      s.position.y = Math.min(1_200, s.position.y);
    }

    this.sequence += 1;
    s.sequence = this.sequence;
    s.timestamp = performance.now();
  }

  getSnapshot(timestamp = performance.now()): ArcadeSnapshot {
    return { ...this.snapshot, position: { ...this.snapshot.position }, timestamp };
  }
}
