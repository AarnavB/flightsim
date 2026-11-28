import { useState } from "react";
import type { FlightSnapshot } from "../simulation/flight-simulation";

export function StartupGuide(props: {
  snapshot: FlightSnapshot | null;
  visible: boolean;
  onToggleMaster: () => void;
  onToggleFuel: () => void;
  onToggleIgnition: () => void;
  onToggleAvionics: () => void;
  onStartEngine: () => void;
  onShutdownEngine: () => void;
  onRestartSimulation: () => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [beginnerMode, setBeginnerMode] = useState(true);
  if (!props.visible) return null;

  const startup = props.snapshot?.startup;
  const systems = props.snapshot?.systems;
  const steps = startup?.steps ?? [];
  const sections = [
    { id: "electrical", title: "Electrical system", detail: "The battery and alternator provide the simulated electrical bus. Battery power supports the starter; the alternator can support the bus when the engine model is running." },
    { id: "engine", title: "Engine and ignition", detail: "The single piston-engine model transitions through off, starting, running and unstable states. The start request is accepted only when its simulated dependencies are available." },
    { id: "fuel", title: "Fuel system", detail: "Fuel quantity, availability and flow are owned by the fuel subsystem. A closed simulated supply or depleted quantity affects engine behaviour." },
    { id: "avionics", title: "Avionics", detail: "Electrical-dependent avionics become available only when their switch is on and a powered bus exists." }
  ];

  return (
    <aside className="startup-guide" aria-label="Startup guide">
      <header className="startup-guide-header">
        <div><span className="eyebrow">SYSTEMS WALKTHROUGH</span><h2>STARTUP GUIDE</h2></div>
        <button className="close-button" aria-label="Hide startup guide" onClick={props.onClose}>×</button>
      </header>
      <div className="startup-phase">
        <span>CURRENT PHASE</span>
        <b>{startup?.phaseLabel ?? "INITIALISING"}</b>
      </div>
      <div className="startup-progress"><div><span>SIMULATED SYSTEM READINESS</span><b>{startup?.progress ?? 0}%</b></div><i><span style={{ width: (startup?.progress ?? 0) + "%" }} /></i></div>
      <div className="startup-guide-actions">
        <button onClick={props.onToggleMaster} aria-pressed={systems?.electrical.masterOn ?? false}>
          {systems?.electrical.masterOn ? "MASTER: ON" : "ENABLE MASTER"}
        </button>
        <button onClick={props.onToggleFuel} aria-pressed={systems?.fuel.valveOpen ?? false}>
          {systems?.fuel.valveOpen ? "FUEL: AVAILABLE" : "ENABLE FUEL"}
        </button>
        <button onClick={props.onToggleIgnition} aria-pressed={systems?.ignition.enabled ?? false}>
          {systems?.ignition.enabled ? "IGNITION: ON" : "ENABLE IGNITION"}
        </button>
        <button onClick={props.onStartEngine} disabled={systems?.engine.state === "starting" || systems?.engine.state === "running"}>
          {systems?.engine.state === "starting" ? "STARTING SIMULATION…" : systems?.engine.state === "running" ? "ENGINE RUNNING" : "REQUEST ENGINE START"}
        </button>
        <button onClick={props.onShutdownEngine} disabled={systems?.engine.state !== "running" && systems?.engine.state !== "unstable"}>SHUT DOWN ENGINE MODEL</button>
        <button onClick={props.onToggleAvionics} aria-pressed={systems?.avionics.switchOn ?? false}>
          {systems?.avionics.switchOn ? "AVIONICS SWITCH: ON" : "ENABLE AVIONICS"}
        </button>
      </div>
      {startup?.blockedReason && <p className="startup-blocked" role="status">{startup.blockedReason}</p>}
      <div className="startup-steps">
        <div className="startup-section-heading"><b>System state</b><button onClick={() => setExpanded(value => !value)}>{expanded ? "COLLAPSE" : "EXPAND"}</button></div>
        {steps.map(step => (
          <div className="startup-step" key={step.id}>
            <span className={"step-indicator " + step.status}>{step.status === "complete" ? "✓" : step.status === "blocked" ? "!" : "·"}</span>
            <div><b>{step.title}</b><small>{step.detail}</small></div>
          </div>
        ))}
        {expanded && sections.map(section => (
          <details className="startup-detail" key={section.id}>
            <summary>{section.title}</summary>
            <p>{beginnerMode ? section.detail : section.detail.split(".")[0] + "."}</p>
          </details>
        ))}
      </div>
      {systems?.apu && (
        <div className="startup-apu"><span>OPTIONAL APU SUBSYSTEM</span><b>{systems.apu.state.toUpperCase()}</b></div>
      )}
      <label className="startup-beginner"><input type="checkbox" checked={beginnerMode} onChange={event => setBeginnerMode(event.target.checked)} /> Beginner explanations</label>
      <p className="startup-note">
        {systems?.apu === null ? "C172P PROFILE · SINGLE PISTON ENGINE · NO APU" : "Aircraft systems are profile-dependent."}
        {" "}This is an abstract software demonstration, not an operating checklist or a real-aircraft procedure.
      </p>
      <footer className="startup-guide-footer">
        <button onClick={() => { setExpanded(true); setBeginnerMode(true); }}>RESET GUIDE VIEW</button>
        <button onClick={props.onRestartSimulation}>RESTART SIMULATION</button>
      </footer>
    </aside>
  );
}
