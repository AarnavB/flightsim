import * as THREE from "three";

export interface CameraMotion {
  velocity: THREE.Vector3;
  yawRate: number;
  pitchRate: number;
  speed: number;
  sensitivity: number;
}

export const cameraMotion: CameraMotion = {
  velocity: new THREE.Vector3(),
  yawRate: 0,
  pitchRate: 0,
  speed: 1_200,
  sensitivity: 1
};

export const RESET_CAMERA_EVENT = "flightsim:reset-camera";