import type { TerrainPayload, TerrainRequest } from "../types";
import { buildTerrainPayload } from "./terrain-geometry";

interface WorkerResponse extends Partial<TerrainPayload> {
  tileId: string;
  error?: string;
}

/** Dedicated cancellable worker per request; concurrency is bounded by the scheduler. */
export class TerrainWorkerClient {
  private readonly workers = new Set<Worker>();

  generate(request: TerrainRequest, signal: AbortSignal): Promise<TerrainPayload> {
    if (signal.aborted) {
      return Promise.reject(new DOMException("Request cancelled.", "AbortError"));
    }

    if (typeof Worker === "undefined") {
      return Promise.resolve().then(() => {
        if (signal.aborted) throw new DOMException("Request cancelled.", "AbortError");
        return buildTerrainPayload(request);
      });
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./terrain.worker.ts", import.meta.url), { type: "module" });
      this.workers.add(worker);

      const finish = () => {
        signal.removeEventListener("abort", abort);
        worker.terminate();
        this.workers.delete(worker);
      };
      const abort = () => {
        finish();
        reject(new DOMException("Request cancelled.", "AbortError"));
      };

      signal.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        finish();
        if (response.error) reject(new Error(response.error));
        else resolve(response as TerrainPayload);
      };
      worker.onerror = (event) => {
        finish();
        reject(new Error(event.message || "Terrain worker failed."));
      };
      worker.postMessage(request);
    });
  }

  activeWorkers(): number { return this.workers.size; }

  dispose(): void {
    for (const worker of this.workers) worker.terminate();
    this.workers.clear();
  }
}