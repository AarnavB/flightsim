/**
 * Data-only aircraft profiles. Performance values marked "approximate" are
 * software tuning assumptions, not manufacturer-approved flight data.
 */
export interface AircraftConfiguration {
  id: string;
  displayName: string;
  engine: {
    count: number;
    model: string;
    kind: "piston" | "turbine";
    propeller: "fixed-pitch" | "constant-speed" | "none";
    maximumPowerW: number;
    maximumRpm: number;
    idleRpm: number;
  };
  massKg: number;
  wingAreaM2: number;
  wingSpanM: number;
  meanChordM: number;
  aspectRatio: number;
  inertiaKgM2: { roll: number; pitch: number; yaw: number };
  initialFuelGallons: number;
  hasApu: boolean;
  apu?: { displayName: string; maximumElectricalPowerW: number; pneumaticSupply: boolean };
}

export const C172P_CONFIGURATION: AircraftConfiguration = {
  id: "cessna-172p-1981",
  displayName: "Cessna 172P (1981)",
  engine: {
    count: 1,
    model: "Avco Lycoming O-320-D2J",
    kind: "piston",
    propeller: "fixed-pitch",
    maximumPowerW: 119_000,
    maximumRpm: 2_700,
    idleRpm: 650
  },
  // Geometry, mass and inertias are documented simulation approximations.
  massKg: 1_040,
  wingAreaM2: 16.2,
  wingSpanM: 10.97,
  meanChordM: 1.49,
  aspectRatio: 7.43,
  inertiaKgM2: { roll: 1_280, pitch: 1_820, yaw: 2_650 },
  initialFuelGallons: 24,
  hasApu: false
};

/** Fictional profile used only to exercise optional APU-capable architecture. */
export const APU_DEMONSTRATION_CONFIGURATION: AircraftConfiguration = {
  id: "fictional-apu-demonstrator",
  displayName: "Fictional APU Systems Demonstrator",
  engine: {
    count: 2,
    model: "Fictional twin turbine",
    kind: "turbine",
    propeller: "none",
    maximumPowerW: 450_000,
    maximumRpm: 15_000,
    idleRpm: 4_000
  },
  massKg: 4_500,
  wingAreaM2: 28,
  wingSpanM: 16,
  meanChordM: 1.9,
  aspectRatio: 9.14,
  inertiaKgM2: { roll: 18_000, pitch: 26_000, yaw: 34_000 },
  initialFuelGallons: 120,
  hasApu: true,
  apu: { displayName: "Demonstration APU", maximumElectricalPowerW: 35_000, pneumaticSupply: true }
};

export function validateAircraftConfiguration(config: AircraftConfiguration): string[] {
  const errors: string[] = [];
  if (!config.id.trim() || !config.displayName.trim()) errors.push("Aircraft identity is required.");
  if (!Number.isInteger(config.engine.count) || config.engine.count < 1) errors.push("Engine count must be a positive integer.");
  for (const [name, value] of Object.entries({
    massKg: config.massKg,
    wingAreaM2: config.wingAreaM2,
    wingSpanM: config.wingSpanM,
    meanChordM: config.meanChordM,
    aspectRatio: config.aspectRatio,
    maximumPowerW: config.engine.maximumPowerW,
    maximumRpm: config.engine.maximumRpm,
    idleRpm: config.engine.idleRpm
  })) {
    if (!Number.isFinite(value) || value <= 0) errors.push(name + " must be finite and positive.");
  }
  if (config.hasApu !== Boolean(config.apu)) errors.push("APU configuration must agree with hasApu.");
  if (config.initialFuelGallons < 0 || !Number.isFinite(config.initialFuelGallons)) errors.push("Initial fuel must be finite and non-negative.");
  return errors;
}
