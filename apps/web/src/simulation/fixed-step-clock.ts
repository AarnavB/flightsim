export interface FixedStepAdvance {
  steps: number;
  clampedDelta: number;
  alpha: number;
  droppedThisFrame: number;
  totalDroppedSteps: number;
}

/** Deterministic accumulator shared by the worker and unit tests. */
export class FixedStepClock {
  readonly fixedStep: number;
  readonly maximumFrameDelta: number;
  readonly maximumCatchUpSteps: number;
  private accumulator = 0;
  private dropped = 0;

  constructor(options: { fixedStep?: number; maximumFrameDelta?: number; maximumCatchUpSteps?: number } = {}) {
    this.fixedStep = options.fixedStep ?? 1 / 120;
    this.maximumFrameDelta = options.maximumFrameDelta ?? 0.12;
    this.maximumCatchUpSteps = options.maximumCatchUpSteps ?? 12;
    if (!(this.fixedStep > 0) || !(this.maximumFrameDelta > 0) ||
      !Number.isInteger(this.maximumCatchUpSteps) || this.maximumCatchUpSteps < 1) {
      throw new RangeError("Fixed-step clock configuration is invalid.");
    }
  }

  advance(frameDelta: number, step: (fixedDelta: number) => void): FixedStepAdvance {
    const clampedDelta = Number.isFinite(frameDelta) ? Math.max(0, Math.min(this.maximumFrameDelta, frameDelta)) : 0;
    this.accumulator += clampedDelta;
    let steps = 0;
    while (this.accumulator + 1e-12 >= this.fixedStep && steps < this.maximumCatchUpSteps) {
      step(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    let droppedThisFrame = 0;
    if (this.accumulator >= this.fixedStep) {
      droppedThisFrame = Math.floor(this.accumulator / this.fixedStep);
      this.accumulator -= droppedThisFrame * this.fixedStep;
      this.dropped += droppedThisFrame;
    }
    return {
      steps, clampedDelta, alpha: Math.max(0, Math.min(1, this.accumulator / this.fixedStep)),
      droppedThisFrame, totalDroppedSteps: this.dropped
    };
  }

  clearAccumulator(): void { this.accumulator = 0; }
  reset(): void { this.accumulator = 0; this.dropped = 0; }
  get droppedSteps(): number { return this.dropped; }
}
