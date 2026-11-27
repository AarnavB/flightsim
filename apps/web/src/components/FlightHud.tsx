import type { ArcadeSnapshot } from "../simulation/arcade-flight";

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flight-metric"><span>{label}</span><b>{value}</b></div>;
}

export function FlightHud({ snapshot, visible }: { snapshot: ArcadeSnapshot | null; visible: boolean }) {
  if (!visible) return null;
  if (!snapshot) return <div className="flight-hud loading-hud" aria-live="polite">INITIALISING GAME SIMULATION</div>;
  return (
    <section className="flight-hud" aria-label="Arcade flight telemetry">
      <div className="hud-heading"><span>ARCADE TELEMETRY</span><b>{snapshot.paused ? "PAUSED" : snapshot.onGround ? "GROUND MODE" : "AIR MODE"}</b></div>
      <div className="hud-grid">
        <Metric label="GAME SPEED" value={snapshot.speed.toFixed(0)} />
        <Metric label="WORLD HEIGHT" value={snapshot.position.y.toFixed(0)} />
        <Metric label="HEADING" value={`${snapshot.headingDeg.toFixed(0)}°`} />
        <Metric label="PITCH" value={`${snapshot.pitchDeg.toFixed(0)}°`} />
        <Metric label="BANK" value={`${snapshot.bankDeg.toFixed(0)}°`} />
        <Metric label="POWER" value={`${Math.round(snapshot.throttle * 100)}%`} />
      </div>
      <div className="hud-power"><span>POWER</span><div><i style={{ width: `${snapshot.throttle * 100}%` }} /></div></div>
      <div className="hud-footnote">ILLUSTRATIVE GAME VALUES · NOT FLIGHT INSTRUMENTS</div>
    </section>
  );
}
