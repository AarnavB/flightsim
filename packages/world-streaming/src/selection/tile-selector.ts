import * as THREE from "three";
import type { TileMetadata } from "@flightsim/shared-types";
import { boundsCenter } from "@flightsim/geography";
import type { LocalTangentFrame } from "@flightsim/geography";
import { TileTree } from "../quadtree/tile-tree";

export interface SelectionConfig {
  maxLod: number;
  maxDistance: number;
  maxTiles: number;
  targetScreenError: number;
}

/**
 * Hierarchical frustum / distance selector with screen-space-error LOD and
 * a two-threshold hysteresis band to avoid rapid oscillation near boundaries.
 */
export class TileSelector {
  private previouslyRefined = new Set<string>();

  constructor(private readonly tree: TileTree, private readonly frame: LocalTangentFrame) {}

  select(
    camera: THREE.PerspectiveCamera,
    frustum: THREE.Frustum,
    config: SelectionConfig,
    anchor: THREE.Vector3 = camera.position
  ): TileMetadata[] {
    const selected: TileMetadata[] = [];
    const refinedThisPass = new Set<string>();
    let visited = 0;
    const maxVisited = Math.max(256, config.maxTiles * 48);

    const visit = (node: TileMetadata) => {
      visited += 1;
      if (visited > maxVisited) return;

      const bounds = node.bounds;
      const center = boundsCenter(bounds);
      const position = this.frame.toRender(center);
      const latitudeSpan = (bounds.north - bounds.south) * 111_000;
      const longitudeSpan =
        (bounds.east - bounds.west) *
        111_000 *
        Math.max(0.05, Math.cos(center.latitude * Math.PI / 180));
      const radius = Math.hypot(latitudeSpan, longitudeSpan) * 0.58 + 5_000;
      const sphere = new THREE.Sphere(new THREE.Vector3(...position), radius);
      const distanceToSphere = Math.max(0, anchor.distanceTo(sphere.center) - radius);

      if (distanceToSphere > config.maxDistance || !frustum.intersectsSphere(sphere)) return;

      const tileSize = Math.max(latitudeSpan, longitudeSpan);
      const geometricError = tileSize / 80;
      const focalPixels = 900 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      const screenError = geometricError * focalPixels /
        Math.max(1, distanceToSphere + radius * 0.5);
      const wasRefined = this.previouslyRefined.has(node.id);
      const threshold = config.targetScreenError * (wasRefined ? 0.8 : 1.2);
      const refine = node.level < config.maxLod &&
        (node.level < 2 || screenError > threshold);

      if (refine) {
        refinedThisPass.add(node.id);
        for (const child of this.tree.children(node.id)) visit(child);
      } else {
        selected.push(node);
      }
    };

    visit(this.tree.get("0/0/0"));
    selected.sort((a, b) => this.distanceTo(anchor, a) - this.distanceTo(anchor, b));
    this.previouslyRefined = refinedThisPass;
    return selected.slice(0, config.maxTiles);
  }

  private distanceTo(anchor: THREE.Vector3, tile: TileMetadata): number {
    const point = this.frame.toRender(boundsCenter(tile.bounds));
    return anchor.distanceToSquared(new THREE.Vector3(...point));
  }
}