import { buildTerrainPayload } from "./terrain-geometry";
import type { TerrainRequest } from "../types";

interface WorkerScope {
  onmessage: ((event: MessageEvent<TerrainRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as WorkerScope;
workerScope.onmessage = (event) => {
  try {
    const payload = buildTerrainPayload(event.data);
    workerScope.postMessage(
      payload,
      [payload.positions.buffer, payload.uvs.buffer, payload.indices.buffer]
    );
  } catch (error) {
    workerScope.postMessage({
      tileId: event.data.tileId,
      error: error instanceof Error ? error.message : "Terrain worker failed."
    });
  }
};