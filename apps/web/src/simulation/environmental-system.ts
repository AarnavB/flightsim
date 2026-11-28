import type { EnvironmentConfiguration } from "./flight-simulation";

/** Local, user-configurable atmosphere. Defaults to a synthetic standard-day fixture. */
export class EnvironmentalSystem {
  private state: EnvironmentConfiguration;

  constructor(initial: EnvironmentConfiguration) {
    this.state = { ...initial };
  }

  configure(next: Partial<EnvironmentConfiguration>): void {
    this.state = {
      temperatureC: finiteClamp(next.temperatureC ?? this.state.temperatureC, -60, 55),
      pressureHpa: finiteClamp(next.pressureHpa ?? this.state.pressureHpa, 500, 1_100),
      windEastMps: finiteClamp(next.windEastMps ?? this.state.windEastMps, -40, 40),
      windNorthMps: finiteClamp(next.windNorthMps ?? this.state.windNorthMps, -40, 40),
      visibilityKm: finiteClamp(next.visibilityKm ?? this.state.visibilityKm, 0.1, 50)
    };
  }

  get densityKgM3(): number {
    const temperatureK = Math.max(180, this.state.temperatureC + 273.15);
    const pressurePa = Math.max(20_000, this.state.pressureHpa * 100);
    return pressurePa / (287.05 * temperatureK);
  }

  getSnapshot(): EnvironmentConfiguration {
    return { ...this.state };
  }
}

function finiteClamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}
