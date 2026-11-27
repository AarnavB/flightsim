import { ArcadeFlightModel, type ArcadeControls, type SpawnPreset } from "./arcade-flight";

type WorkerCommand =
  | { type: "controls"; controls: Partial<ArcadeControls> }
  | { type: "pause"; paused: boolean }
  | { type: "toggle-pause" }
  | { type: "toggle-power" }
  | { type: "reset" }
  | { type: "spawn"; preset: SpawnPreset };

const model = new ArcadeFlightModel("runway");
const fixedStep = 1 / 60;
let lastTime = performance.now();
let lastPublish = 0;
let accumulator = 0;
let droppedSteps = 0;
let sequence = 0;

self.addEventListener("message", (event: MessageEvent<WorkerCommand>) => {
  const message = event.data;
  switch (message.type) {
    case "controls": model.setControls(message.controls); break;
    case "pause": model.setPaused(message.paused); break;
    case "toggle-pause": model.togglePaused(); break;
    case "toggle-power": model.togglePower(); break;
    case "reset": model.reset(); accumulator = 0; break;
    case "spawn": model.spawn(message.preset); accumulator = 0; break;
  }
});

// Physics is intentionally fixed-step and independent of the display refresh rate.
setInterval(() => {
  const now = performance.now();
  const frameDelta = Math.max(0, Math.min(0.12, (now - lastTime) / 1000));
  lastTime = now;
  const current = model.getSnapshot(now);

  if (!current.paused) {
    accumulator += frameDelta;
    let steps = 0;
    while (accumulator >= fixedStep && steps < 8) {
      model.step(fixedStep);
      accumulator -= fixedStep;
      steps += 1;
    }
    if (accumulator >= fixedStep) {
      const missed = Math.floor(accumulator / fixedStep);
      droppedSteps += missed;
      accumulator %= fixedStep;
    }
  } else {
    accumulator = 0;
  }

  if (now - lastPublish >= 66) {
    lastPublish = now;
    sequence += 1;
    const snapshot = model.getSnapshot(now);
    self.postMessage({
      type: "snapshot",
      snapshot: { ...snapshot, sequence, droppedSteps }
    });
  }
}, 8);
