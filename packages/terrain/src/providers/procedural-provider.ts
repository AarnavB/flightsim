import type { LocalTangentFrame } from "@flightsim/geography";
import type { TerrainPayload, TerrainProvider, TerrainRequest } from "../types";
import { TerrainWorkerClient } from "../procedural/worker-client";

export class ProceduralTerrainProvider implements TerrainProvider {
  private readonly worker = new TerrainWorkerClient();

  constructor(private readonly frame: LocalTangentFrame) {}

  generate(request: TerrainRequest, signal: AbortSignal): Promise<TerrainPayload> {
    return this.worker.generate({ ...request, origin: this.frame.origin }, signal);
  }

  activeWorkers(): number { return this.worker.activeWorkers(); }

  dispose(): void { this.worker.dispose(); }
}