import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeSnapshot } from "../simulation/arcade-flight";
import { RESET_CAMERA_EVENT } from "../camera/camera-motion";

export type CameraMode = "cockpit" | "chase" | "orbit" | "free";

export function ArcadeCameraRig({ snapshot, mode }: { snapshot: ArcadeSnapshot | null; mode: CameraMode }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const orbit = useRef({ azimuth: 0, elevation: 0.28, distance: 30 });
  const pointer = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const freePose = useRef({ position: new THREE.Vector3(0, 14, 35), yaw: 0, pitch: -0.12 });
  const initializedMode = useRef<CameraMode | null>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const desiredPosition = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const localOffset = useRef(new THREE.Vector3());
  const orientation = useRef(new THREE.Quaternion());
  const rotation = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    const element = gl.domElement;
    element.style.touchAction = "none";
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || (mode !== "orbit" && mode !== "free")) return;
      pointer.current = { x: event.clientX, y: event.clientY, active: true };
      element.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!pointer.current.active) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      if (mode === "orbit") {
        orbit.current.azimuth -= dx * 0.004;
        orbit.current.elevation = THREE.MathUtils.clamp(orbit.current.elevation + dy * 0.003, -0.08, 1.1);
      } else {
        freePose.current.yaw -= dx * 0.003;
        freePose.current.pitch = THREE.MathUtils.clamp(freePose.current.pitch - dy * 0.0025, -1.35, 1.35);
      }
    };
    const pointerUp = () => { pointer.current.active = false; };
    const wheel = (event: WheelEvent) => {
      if (mode === "orbit") orbit.current.distance = THREE.MathUtils.clamp(orbit.current.distance * Math.exp(event.deltaY * 0.001), 9, 150);
    };
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (["i", "j", "k", "l", "u", "o", "home"].includes(key)) keys.current.add(key);
      if (key === "home") {
        freePose.current.position.set(0, 14, 35);
        freePose.current.yaw = 0;
        freePose.current.pitch = -0.12;
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => { keys.current.clear(); pointer.current.active = false; };
    const reset = () => {
      orbit.current = { azimuth: 0, elevation: 0.28, distance: 30 };
      freePose.current.position.set(0, 14, 35);
      freePose.current.yaw = 0;
      freePose.current.pitch = -0.12;
    };
    element.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    element.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    window.addEventListener(RESET_CAMERA_EVENT, reset);
    return () => {
      element.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener(RESET_CAMERA_EVENT, reset);
    };
  }, [gl, mode]);

  useFrame((_, delta) => {
    if (!snapshot) return;
    const dt = Math.min(delta, 0.05);
    targetPosition.current.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
    rotation.current.set(
      THREE.MathUtils.degToRad(snapshot.pitchDeg),
      -THREE.MathUtils.degToRad(snapshot.headingDeg),
      THREE.MathUtils.degToRad(snapshot.bankDeg),
      "YXZ"
    );
    orientation.current.setFromEuler(rotation.current);
    forward.current.set(0, 0, -1).applyQuaternion(orientation.current).normalize();
    up.current.set(0, 1, 0).applyQuaternion(orientation.current).normalize();

    if (initializedMode.current !== mode) {
      initializedMode.current = mode;
      if (mode === "free") {
        freePose.current.position.copy(camera.position);
      }
    }

    if (mode === "cockpit") {
      localOffset.current.set(0, 0.72, -0.45).applyQuaternion(orientation.current);
      desiredPosition.current.copy(targetPosition.current).add(localOffset.current);
      lookTarget.current.copy(desiredPosition.current).addScaledVector(forward.current, 45);
      camera.position.lerp(desiredPosition.current, Math.min(1, dt * 10));
      camera.up.copy(up.current);
      camera.lookAt(lookTarget.current);
    } else if (mode === "chase") {
      localOffset.current.set(0, 6.5, 21).applyQuaternion(orientation.current);
      desiredPosition.current.copy(targetPosition.current).add(localOffset.current);
      lookTarget.current.copy(targetPosition.current).addScaledVector(forward.current, 4);
      lookTarget.current.y += 1.2;
      camera.position.lerp(desiredPosition.current, Math.min(1, dt * 3.6));
      camera.up.set(0, 1, 0);
      camera.lookAt(lookTarget.current);
    } else if (mode === "orbit") {
      const { azimuth, elevation, distance } = orbit.current;
      const horizontal = Math.cos(elevation) * distance;
      desiredPosition.current.set(
        targetPosition.current.x + Math.sin(azimuth) * horizontal,
        targetPosition.current.y + Math.sin(elevation) * distance + 2,
        targetPosition.current.z + Math.cos(azimuth) * horizontal
      );
      camera.position.lerp(desiredPosition.current, Math.min(1, dt * 5));
      lookTarget.current.copy(targetPosition.current);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookTarget.current);
    } else {
      rotation.current.set(freePose.current.pitch, freePose.current.yaw, 0, "YXZ");
      const freeQuaternion = orientation.current.setFromEuler(rotation.current);
      forward.current.set(0, 0, -1).applyQuaternion(freeQuaternion).normalize();
      right.current.set(1, 0, 0).applyQuaternion(freeQuaternion).normalize();
      const movement = new THREE.Vector3();
      const k = keys.current;
      if (k.has("i")) movement.add(forward.current);
      if (k.has("k")) movement.sub(forward.current);
      if (k.has("l")) movement.add(right.current);
      if (k.has("j")) movement.sub(right.current);
      if (k.has("u")) movement.y += 1;
      if (k.has("o")) movement.y -= 1;
      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(45 * dt);
        freePose.current.position.add(movement);
      }
      camera.position.copy(freePose.current.position);
      camera.quaternion.copy(freeQuaternion);
      camera.up.set(0, 1, 0);
    }
  });

  return null;
}
