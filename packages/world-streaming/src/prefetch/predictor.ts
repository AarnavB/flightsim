import * as THREE from "three";
import { neighborTileIds, tileForCoordinate } from "@flightsim/geography";
import type { LocalTangentFrame } from "@flightsim/geography";
import { TileTree } from "../quadtree/tile-tree";

export class PrefetchPredictor {
  constructor(
    private readonly frame: LocalTangentFrame,
    private readonly tree: TileTree
  ) {}

  predict(
    camera: THREE.PerspectiveCamera,
    velocity: THREE.Vector3,
    maxLod: number,
    horizonSeconds = 2.5
  ): string[] {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const lookAhead = camera.position.clone()
      .addScaledVector(velocity, horizonSeconds)
      .addScaledVector(direction, 12_000);
    const predicted = this.frame.fromRender(lookAhead.x, lookAhead.y, lookAhead.z);
    const level = Math.max(2, maxLod - 1);
    const centerId = tileForCoordinate(predicted, level);
    const ids = [centerId, ...neighborTileIds(centerId, 1)];

    return ids.slice(0, 12).filter((id) => this.tree.get(id).level <= maxLod);
  }
}