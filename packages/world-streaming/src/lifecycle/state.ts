export type TileState =
  | "Unloaded" | "Queued" | "Loading" | "Decoding" | "Ready"
  | "Resident" | "Visible" | "Retained" | "Evicting" | "Failed";

const transitions: Record<TileState, readonly TileState[]> = {
  Unloaded: ["Queued"],
  Queued: ["Loading", "Unloaded", "Failed"],
  Loading: ["Decoding", "Unloaded", "Failed"],
  Decoding: ["Ready", "Unloaded", "Failed"],
  Ready: ["Resident", "Evicting", "Failed"],
  Resident: ["Visible", "Retained", "Evicting"],
  Visible: ["Resident", "Retained"],
  Retained: ["Visible", "Evicting"],
  Evicting: ["Unloaded"],
  Failed: ["Queued", "Unloaded"]
};

export class TileLifecycle {
  private readonly states = new Map<string, TileState>();
  private readonly failures = new Map<string, number>();

  get(id: string): TileState { return this.states.get(id) ?? "Unloaded"; }

  transition(id: string, next: TileState): void {
    const current = this.get(id);
    if (!transitions[current].includes(next)) {
      throw new Error("Illegal tile lifecycle transition: " + current + " -> " + next + " (" + id + ")");
    }
    this.states.set(id, next);
    if (next === "Failed") this.failures.set(id, (this.failures.get(id) ?? 0) + 1);
    if (next === "Unloaded") this.failures.delete(id);
  }

  failureCount(id: string): number { return this.failures.get(id) ?? 0; }
  entries(): IterableIterator<[string, TileState]> { return this.states.entries(); }
  forget(id: string): void { this.states.delete(id); this.failures.delete(id); }
}