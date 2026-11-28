import { FlightSimulation, type FlightControls, type SpawnPreset, type EnvironmentConfiguration } from "./flight-simulation";
import { FixedStepClock } from "./fixed-step-clock";

type WorkerCommand =
  | { type: "controls"; controls: Partial<FlightControls> }
  | { type: "pause"; paused: boolean }
  | { type: "toggle-pause" }
  | { type: "toggle-power" }
  | { type: "toggle-master" }
  | { type: "toggle-alternator" }
  | { type: "toggle-fuel" }
  | { type: "toggle-ignition" }
  | { type: "toggle-avionics" }
  | { type: "start-request" }
  | { type: "apu-start" }
  | { type: "apu-shutdown" }
  | { type: "engine-shutdown" }
  | { type: "engine-failure"; index?: number }
  | { type: "apu-failure" }
  | { type: "environment"; environment: Partial<EnvironmentConfiguration> }
  | { type: "reset" }
  | { type: "spawn"; preset: SpawnPreset };

const simulation = new FlightSimulation();
const clock = new FixedStepClock();
const publishIntervalMs = 83;
let lastTime = performance.now();
let lastPublish = 0;
let sequence = 0;

self.addEventListener("message", (event: MessageEvent<WorkerCommand>) => {
  const message = event.data;
  switch (message.type) {
    case "controls": simulation.setControls(message.controls); break;
    case "pause": simulation.setPaused(message.paused); clock.clearAccumulator(); break;
    case "toggle-pause": simulation.togglePaused(); clock.clearAccumulator(); break;
    case "toggle-power": case "toggle-master": simulation.toggleMaster(); break;
    case "toggle-alternator": simulation.toggleAlternator(); break;
    case "toggle-fuel": simulation.toggleFuel(); break;
    case "toggle-ignition": simulation.toggleIgnition(); break;
    case "toggle-avionics": simulation.toggleAvionics(); break;
    case "start-request": simulation.requestEngineStart(); break;
    case "apu-start": simulation.requestApuStart(); break;
    case "apu-shutdown": simulation.shutdownApu(); break;
    case "engine-shutdown": simulation.shutdownEngines(); break;
    case "engine-failure": simulation.injectEngineFailure(message.index ?? 0); break;
    case "apu-failure": simulation.injectApuFailure(); break;
    case "environment": simulation.setEnvironment(message.environment); break;
    case "reset": simulation.reset(); clock.reset(); break;
    case "spawn": simulation.setSpawn(message.preset); clock.clearAccumulator(); break;
  }
});

setInterval(() => {
  const now = performance.now();
  const frameDelta = (now - lastTime) / 1000;
  lastTime = now;
  if (!simulation.paused) {
    const timing = clock.advance(frameDelta, fixedDelta => simulation.step(fixedDelta));
    simulation.setDroppedSteps(timing.totalDroppedSteps);
  } else clock.clearAccumulator();

  if (now - lastPublish >= publishIntervalMs) {
    lastPublish = now;
    sequence += 1;
    const snapshot = simulation.getSnapshot(now);
    self.postMessage({ type: "snapshot", snapshot: { ...snapshot, sequence } });
  }
}, 4);
