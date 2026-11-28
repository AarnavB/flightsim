import type { AircraftSystemsSnapshot } from "./aircraft-systems";

export type StartupPhase = "cold-dark" | "electrical" | "engine-start" | "avionics" | "ready";

export interface StartupGuideStep {
  id: "electrical" | "fuel" | "ignition" | "engine" | "avionics";
  title: string;
  status: "complete" | "pending" | "blocked";
  detail: string;
}

export interface StartupGuideSnapshot {
  phase: StartupPhase;
  phaseLabel: string;
  progress: number;
  steps: StartupGuideStep[];
  blockedReason: string | null;
  warnings: string[];
}

export class StartupStateMachine {
  evaluate(systems: AircraftSystemsSnapshot): StartupGuideSnapshot {
    const electricalReady = systems.electrical.busPowered;
    const fuelReady = systems.fuel.available;
    const ignitionReady = systems.ignition.available;
    const engineReady = systems.engine.state === "running";
    const avionicsReady = systems.avionics.powered;

    let phase: StartupPhase;
    if (!systems.electrical.masterOn) phase = "cold-dark";
    else if (!electricalReady) phase = "electrical";
    else if (!engineReady) phase = "engine-start";
    else if (!avionicsReady) phase = "avionics";
    else phase = "ready";

    const steps: StartupGuideStep[] = [
      { id: "electrical", title: "Electrical supply", status: electricalReady ? "complete" : "pending",
        detail: electricalReady ? "The simulated aircraft bus has power." : "The electrical bus is not available yet." },
      { id: "fuel", title: "Fuel-system availability", status: fuelReady ? "complete" : "pending",
        detail: fuelReady ? "The simulated fuel supply is available." : systems.fuel.warning ?? "Fuel supply is unavailable." },
      { id: "ignition", title: "Ignition-system availability", status: ignitionReady ? "complete" : "pending",
        detail: ignitionReady ? "The simulated ignition channels are enabled." : "The simulated ignition system is disabled." },
      { id: "engine", title: "Engine state", status: engineReady ? "complete" : systems.engine.state === "failed" ? "blocked" : "pending",
        detail: engineReady ? "The engine model is running." : systems.startBlockedReason ?? systems.engine.warning ?? "The engine model is not running." },
      { id: "avionics", title: "Avionics availability", status: avionicsReady ? "complete" : "pending",
        detail: avionicsReady ? "Electrical-dependent instruments are powered." : systems.avionics.warning ?? "Avionics are not powered." }
    ];
    const completed = steps.filter(step => step.status === "complete").length;
    const warnings = [systems.electrical.warning, systems.fuel.warning, systems.engine.warning, systems.avionics.warning].filter((value): value is string => Boolean(value));
    const blockedReason = systems.startBlockedReason ?? (phase === "engine-start" && !fuelReady ? "Enable the simulated fuel supply before requesting an engine-start simulation." :
      phase === "engine-start" && !ignitionReady ? "Enable the simulated ignition system before requesting an engine-start simulation." :
      phase === "engine-start" && !systems.electrical.starterAvailable ? "The battery-powered starter is unavailable while the electrical supply is off." : null);
    return {
      phase,
      phaseLabel: phase === "cold-dark" ? "COLD & DARK" : phase === "electrical" ? "ELECTRICAL INITIALISATION" :
        phase === "engine-start" ? "ENGINE START SIMULATION" : phase === "avionics" ? "AVIONICS READINESS" : "SYSTEMS READY",
      progress: Math.round(completed / steps.length * 100),
      steps,
      blockedReason,
      warnings
    };
  }
}
