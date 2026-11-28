import type { AircraftConfiguration } from "./aircraft-config";

export type EngineState = "off" | "starting" | "running" | "unstable" | "failed";
export type ApuState = "unavailable" | "off" | "initialising" | "available" | "failed";

export interface AircraftSystemsSnapshot {
  electrical: {
    masterOn: boolean; alternatorSwitchOn: boolean; alternatorOnline: boolean;
    busPowered: boolean; starterAvailable: boolean; batteryCharge: number;
    busVoltage: number; estimatedLoadW: number; warning: string | null;
  };
  fuel: { valveOpen: boolean; quantityGallons: number; flowGph: number; available: boolean; warning: string | null };
  ignition: { enabled: boolean; magnetoA: boolean; magnetoB: boolean; available: boolean };
  engines: Array<{ state: EngineState; rpm: number; powerW: number; starterEngaged: boolean; warning: string | null }>;
  engine: {
    state: EngineState; rpm: number; propellerRpm: number; powerW: number;
    oilTemperatureC: number; oilPressurePsi: number; starterEngaged: boolean; warning: string | null;
  };
  avionics: { switchOn: boolean; powered: boolean; navigationAvailable: boolean; warning: string | null };
  apu: { state: ApuState; electricalSupply: boolean; pneumaticSupply: boolean } | null;
  startBlockedReason: string | null;
}

export class ElectricalSystem {
  masterOn = false;
  alternatorSwitchOn = true;
  batteryCharge = 1;
  busPowered = false;
  alternatorOnline = false;
  starterAvailable = false;
  busVoltage = 0;
  estimatedLoadW = 0;
  warning: string | null = null;

  toggleMaster(): void { this.masterOn = !this.masterOn; }
  toggleAlternator(): void { this.alternatorSwitchOn = !this.alternatorSwitchOn; }

  update(dt: number, engineRunning: boolean, starterEngaged: boolean, avionicsOn: boolean): void {
    this.alternatorOnline = this.alternatorSwitchOn && engineRunning;
    this.busPowered = this.alternatorOnline || (this.masterOn && this.batteryCharge > 0.015);
    this.starterAvailable = this.masterOn && this.batteryCharge > 0.025;
    this.estimatedLoadW = (this.masterOn ? 32 : 0) + (avionicsOn && this.busPowered ? 24 : 0) + (starterEngaged ? 650 : 0);
    if (this.alternatorOnline) this.batteryCharge = Math.min(1, this.batteryCharge + dt * 0.0018);
    else if (this.masterOn) this.batteryCharge = Math.max(0, this.batteryCharge - dt * this.estimatedLoadW / 1_400_000);
    this.busVoltage = this.busPowered ? (this.alternatorOnline ? 14.2 : 12.2 + this.batteryCharge * 0.5) : 0;
    this.warning = this.masterOn && !this.busPowered ? "Electrical bus unavailable" : this.batteryCharge < 0.12 ? "Battery reserve low" : null;
  }
}

export class FuelSystem {
  valveOpen = false;
  quantityGallons: number;
  flowGph = 0;
  warning: string | null = null;

  constructor(initialGallons: number) { this.quantityGallons = initialGallons; }
  toggleValve(): void { this.valveOpen = !this.valveOpen; }
  get available(): boolean { return this.valveOpen && this.quantityGallons > 0; }

  update(dt: number, engineRunning: boolean, throttle: number): void {
    this.flowGph = engineRunning && this.available ? 0.8 + throttle * 7.2 : 0;
    this.quantityGallons = Math.max(0, this.quantityGallons - this.flowGph * dt / 3_600);
    this.warning = this.quantityGallons <= 0 ? "Fuel quantity exhausted" : !this.valveOpen ? "Simulated fuel supply disabled" : null;
  }
}

export class IgnitionSystem {
  enabled = false;
  get available(): boolean { return this.enabled; }
  toggle(): void { this.enabled = !this.enabled; }
}

export class EngineSystem {
  state: EngineState = "off";
  rpm = 0;
  oilTemperatureC = 18;
  oilPressurePsi = 0;
  starterEngaged = false;
  warning: string | null = null;
  private startBlockedReason: string | null = null;
  private currentThrottle = 0;
  private maximumRpm = 2_700;

  requestStart(starterAvailable: boolean, fuelAvailable: boolean, ignitionAvailable: boolean): boolean {
    if (this.state === "running" || this.state === "starting") return true;
    if (!starterAvailable) this.startBlockedReason = "Electrical starter power is unavailable.";
    else if (!fuelAvailable) this.startBlockedReason = "The simulated fuel system is not supplying fuel.";
    else if (!ignitionAvailable) this.startBlockedReason = "The simulated ignition system is disabled.";
    else {
      this.startBlockedReason = null;
      this.state = "starting";
      this.starterEngaged = true;
      return true;
    }
    return false;
  }

  injectFailure(): void { this.state = "failed"; this.starterEngaged = false; this.warning = "Simulated engine failure"; }

  shutdown(): void {
    this.state = "off";
    this.starterEngaged = false;
  }

  update(dt: number, config: AircraftConfiguration, starterAvailable: boolean, fuelAvailable: boolean, ignitionAvailable: boolean, throttle: number): void {
    this.currentThrottle = Math.max(0, Math.min(1, throttle));
    this.maximumRpm = config.engine.maximumRpm;
    if (this.state === "starting") {
      if (!starterAvailable || !fuelAvailable || !ignitionAvailable) {
        this.state = "off";
        this.starterEngaged = false;
        this.rpm = Math.max(0, this.rpm * 0.6);
        this.warning = "Start simulation interrupted by an unavailable subsystem";
      } else {
        this.rpm = Math.min(config.engine.idleRpm + 80, this.rpm + 980 * dt);
        if (this.rpm >= config.engine.idleRpm) {
          this.state = "running";
          this.starterEngaged = false;
          this.warning = null;
        }
      }
    } else if (this.state === "running") {
      if (!fuelAvailable || !ignitionAvailable) {
        this.state = "unstable";
        this.warning = !fuelAvailable ? "Engine power unavailable: fuel supply lost" : "Engine power unavailable: ignition lost";
      } else {
        const targetRpm = config.engine.idleRpm + throttle * (config.engine.maximumRpm - config.engine.idleRpm);
        this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 1.7);
        this.warning = null;
      }
    } else if (this.state === "unstable") {
      this.rpm = Math.max(0, this.rpm - 520 * dt);
      if (this.rpm < 80) this.state = "off";
    } else {
      this.rpm = Math.max(0, this.rpm - 700 * dt);
      this.starterEngaged = false;
    }

    const operatingFraction = Math.max(0, Math.min(1, this.rpm / config.engine.maximumRpm));
    this.oilTemperatureC += ((this.state === "running" ? 78 : 18) - this.oilTemperatureC) * Math.min(1, dt * 0.018);
    this.oilPressurePsi = this.state === "running" ? 18 + operatingFraction * 38 : 0;
    if (this.state === "failed") this.warning = "Simulated engine failure";
  }

  get powerFraction(): number {
    return this.state === "running" ? this.currentThrottle * Math.max(0, Math.min(1, this.rpm / this.maximumRpm)) : 0;
  }

  get startReason(): string | null { return this.startBlockedReason; }
}

export class AvionicsSystem {
  switchOn = true;
  powered = false;
  navigationAvailable = false;
  warning: string | null = null;

  toggle(): void { this.switchOn = !this.switchOn; }
  update(busPowered: boolean): void {
    this.powered = this.switchOn && busPowered;
    this.navigationAvailable = this.powered;
    this.warning = this.switchOn && !busPowered ? "Avionics unavailable: electrical bus is off" : null;
  }
}

/** Optional interface-backed subsystem; it is never instantiated on the C172P. */
export class ApuSystem {
  state: ApuState = "off";
  electricalSupply = false;
  pneumaticSupply = false;
  failureInjected = false;

  requestStart(): void { if (!this.failureInjected) this.state = "initialising"; }
  shutdown(): void { this.state = "off"; this.electricalSupply = false; this.pneumaticSupply = false; }
  update(config: AircraftConfiguration, dt: number): void {
    if (!config.hasApu || !config.apu) { this.state = "unavailable"; return; }
    if (this.failureInjected) this.state = "failed";
    else if (this.state === "initialising") this.state = "available";
    this.electricalSupply = this.state === "available" && config.apu.maximumElectricalPowerW > 0;
    this.pneumaticSupply = this.state === "available" && config.apu.pneumaticSupply;
    void dt;
  }
}

export class AircraftSystemsManager {
  readonly electrical = new ElectricalSystem();
  readonly fuel: FuelSystem;
  readonly ignition = new IgnitionSystem();
  readonly engines: EngineSystem[];
  readonly avionics = new AvionicsSystem();
  readonly apu: ApuSystem | null;

  constructor(private readonly configuration: AircraftConfiguration) {
    this.fuel = new FuelSystem(configuration.initialFuelGallons);
    this.engines = Array.from({ length: configuration.engine.count }, () => new EngineSystem());
    this.apu = configuration.hasApu ? new ApuSystem() : null;
  }

  get engine(): EngineSystem { return this.engines[0]; }

  requestEngineStart(): boolean {
    return this.engines.every(engine => engine.requestStart(this.electrical.starterAvailable, this.fuel.available, this.ignition.available));
  }

  shutdownEngines(): void { for (const engine of this.engines) engine.shutdown(); }

  requestApuStart(): boolean {
    if (!this.apu) return false;
    this.apu.requestStart();
    return true;
  }

  shutdownApu(): void { this.apu?.shutdown(); }
  injectEngineFailure(index = 0): void { this.engines[index]?.injectFailure(); }
  injectApuFailure(): void { if (this.apu) this.apu.failureInjected = true; }

  update(dt: number, throttle: number): void {
    let engineRunning = false;
    let starterEngaged = false;
    for (const engine of this.engines) {
      engineRunning ||= engine.state === "running";
      starterEngaged ||= engine.starterEngaged;
    }
    this.electrical.update(dt, engineRunning, starterEngaged, this.avionics.switchOn);
    for (const engine of this.engines) {
      engine.update(dt, this.configuration, this.electrical.starterAvailable, this.fuel.available, this.ignition.available, throttle);
    }
    let runningEngines = 0;
    starterEngaged = false;
    for (const engine of this.engines) {
      if (engine.state === "running") runningEngines += 1;
      starterEngaged ||= engine.starterEngaged;
    }
    this.fuel.update(dt, runningEngines > 0, throttle * runningEngines);
    this.electrical.update(dt, runningEngines > 0, starterEngaged, this.avionics.switchOn);
    this.avionics.update(this.electrical.busPowered);
    this.apu?.update(this.configuration, dt);
  }

  toggleMaster(): void { this.electrical.toggleMaster(); }
  toggleAlternator(): void { this.electrical.toggleAlternator(); }
  toggleFuel(): void { this.fuel.toggleValve(); }
  toggleIgnition(): void { this.ignition.toggle(); }
  toggleAvionics(): void { this.avionics.toggle(); }

  getSnapshot(): AircraftSystemsSnapshot {
    const primary = this.engine;
    return {
      electrical: {
        masterOn: this.electrical.masterOn, alternatorSwitchOn: this.electrical.alternatorSwitchOn,
        alternatorOnline: this.electrical.alternatorOnline, busPowered: this.electrical.busPowered,
        starterAvailable: this.electrical.starterAvailable, batteryCharge: this.electrical.batteryCharge,
        busVoltage: this.electrical.busVoltage, estimatedLoadW: this.electrical.estimatedLoadW,
        warning: this.electrical.warning
      },
      fuel: {
        valveOpen: this.fuel.valveOpen, quantityGallons: this.fuel.quantityGallons,
        flowGph: this.fuel.flowGph, available: this.fuel.available, warning: this.fuel.warning
      },
      ignition: { enabled: this.ignition.enabled, magnetoA: this.ignition.enabled, magnetoB: this.ignition.enabled, available: this.ignition.available },
      engines: this.engines.map(engine => ({
        state: engine.state, rpm: engine.rpm,
        powerW: engine.state === "running" ? this.configuration.engine.maximumPowerW * engine.powerFraction : 0,
        starterEngaged: engine.starterEngaged, warning: engine.warning
      })),
      engine: {
        state: primary.state, rpm: primary.rpm, propellerRpm: primary.rpm,
        powerW: primary.state === "running" ? this.configuration.engine.maximumPowerW * primary.powerFraction : 0,
        oilTemperatureC: primary.oilTemperatureC, oilPressurePsi: primary.oilPressurePsi,
        starterEngaged: primary.starterEngaged, warning: primary.warning
      },
      avionics: {
        switchOn: this.avionics.switchOn, powered: this.avionics.powered,
        navigationAvailable: this.avionics.navigationAvailable, warning: this.avionics.warning
      },
      apu: this.apu ? {
        state: this.apu.state, electricalSupply: this.apu.electricalSupply, pneumaticSupply: this.apu.pneumaticSupply
      } : null,
      startBlockedReason: this.engine.startReason
    };
  }
}
