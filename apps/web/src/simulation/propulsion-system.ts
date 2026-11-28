import type { AircraftConfiguration } from "./aircraft-config";
import type { EngineState } from "./aircraft-systems";

/**
 * Compact fixed-pitch propulsion approximation. This intentionally is not a
 * blade-element/propeller-map solver and does not claim validated thrust data.
 */
export class PropulsionSystem {
  calculateThrust(
    configuration: AircraftConfiguration,
    engine: { state: EngineState; powerW: number },
    trueAirspeedMps: number
  ): number {
    if (engine.state !== "running" || engine.powerW <= 0) return 0;
    const conversionEfficiency = configuration.engine.propeller === "fixed-pitch" ? 0.78 : 0.72;
    const denominator = Math.max(14, Math.abs(trueAirspeedMps));
    return Math.min(2_100, engine.powerW * conversionEfficiency / denominator);
  }
}
