interface ScheduledTask {
  id: string;
  priority: number;
  sequence: number;
  controller: AbortController;
  run: (signal: AbortSignal) => Promise<void>;
}

/** Stable priority queue with request de-duplication and bounded concurrency. */
export class PriorityScheduler {
  private queue: ScheduledTask[] = [];
  private active = new Map<string, ScheduledTask>();
  private sequence = 0;
  private concurrency: number;

  constructor(concurrency = 3) {
    this.concurrency = Math.max(1, Math.floor(concurrency));
  }

  setConcurrency(value: number): void {
    this.concurrency = Math.max(1, Math.floor(value));
    this.pump();
  }

  enqueue(id: string, priority: number, run: (signal: AbortSignal) => Promise<void>): boolean {
    if (this.active.has(id) || this.queue.some((task) => task.id === id)) return false;
    this.queue.push({
      id,
      priority,
      sequence: this.sequence++,
      controller: new AbortController(),
      run
    });
    this.queue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    this.pump();
    return true;
  }

  cancel(id: string): void {
    const queued = this.queue.find((task) => task.id === id);
    if (queued) {
      queued.controller.abort();
      this.queue = this.queue.filter((task) => task.id !== id);
    }
    this.active.get(id)?.controller.abort();
  }

  cancelWhere(keep: ReadonlySet<string>): void {
    for (const task of [...this.queue]) {
      if (!keep.has(task.id)) this.cancel(task.id);
    }
    for (const id of this.active.keys()) {
      if (!keep.has(id)) this.cancel(id);
    }
  }

  private pump(): void {
    while (this.active.size < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task || task.controller.signal.aborted) continue;
      this.active.set(task.id, task);
      void task.run(task.controller.signal)
        .catch(() => undefined)
        .finally(() => {
          this.active.delete(task.id);
          this.pump();
        });
    }
  }

  get pendingCount(): number { return this.queue.length + this.active.size; }
  get activeCount(): number { return this.active.size; }

  dispose(): void {
    for (const task of this.queue) task.controller.abort();
    for (const task of this.active.values()) task.controller.abort();
    this.queue = [];
  }
}