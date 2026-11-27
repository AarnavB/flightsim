import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeSnapshot } from "../simulation/arcade-flight";

/** Original procedural, game-only high-wing aircraft silhouette. */
export function ArcadeAircraft({ snapshot }: { snapshot: ArcadeSnapshot | null }) {
  const root = useRef<THREE.Group>(null);
  const propeller = useRef<THREE.Group>(null);
  const elevator = useRef<THREE.Group>(null);
  const ailerons = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!snapshot) return;
    if (root.current) {
      const target = new THREE.Vector3(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      root.current.position.lerp(target, Math.min(1, delta * 8));
      const targetRotation = new THREE.Euler(
        THREE.MathUtils.degToRad(snapshot.pitchDeg),
        -THREE.MathUtils.degToRad(snapshot.headingDeg),
        THREE.MathUtils.degToRad(snapshot.bankDeg),
        "YXZ"
      );
      const q = new THREE.Quaternion().setFromEuler(targetRotation);
      root.current.quaternion.slerp(q, Math.min(1, delta * 7));
    }
    if (propeller.current) {
      if (snapshot.powered) propeller.current.rotation.z += delta * (8 + snapshot.throttle * 42);
      else propeller.current.rotation.z += delta * 1.4;
    }
    if (elevator.current) elevator.current.rotation.x = -THREE.MathUtils.degToRad(snapshot.pitchDeg * 0.22);
    if (ailerons.current) ailerons.current.rotation.z = THREE.MathUtils.degToRad(snapshot.bankDeg * 0.12);
  });

  const white = "#dfe7e7";
  const trim = "#9aadb5";
  const glass = "#203c4c";
  const rubber = "#18222a";

  return (
    <group ref={root} position={[0, 1.4, 420]}>
      {/* Fuselage: original proportions for a stylised game aircraft, not a scale model. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.38, 5.4, 5, 16]} />
        <meshStandardMaterial color={white} roughness={0.55} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.26, -2.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.37, 1.25, 18]} />
        <meshStandardMaterial color="#e8eeee" roughness={0.48} metalness={0.15} />
      </mesh>
      {/* High-mounted wing and tail surfaces. */}
      <mesh position={[0, 0.72, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[12.4, 0.2, 1.75]} />
        <meshStandardMaterial color={white} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.38, 2.78]} castShadow>
        <boxGeometry args={[3.7, 0.13, 0.92]} />
        <meshStandardMaterial color={white} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.94, 2.83]} castShadow>
        <boxGeometry args={[0.18, 1.3, 0.9]} />
        <meshStandardMaterial color={white} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.74, 3.26]} castShadow>
        <boxGeometry args={[0.12, 0.72, 0.26]} />
        <meshStandardMaterial color="#9aadb5" roughness={0.55} />
      </mesh>
      {/* Dark canopy and side windows are decorative geometry only. */}
      <mesh position={[0, 0.74, -1.25]} scale={[0.84, 0.57, 1.12]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={glass} roughness={0.22} metalness={0.35} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0.405, 0.34, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.62, 0.025, 0.92]} />
        <meshStandardMaterial color={glass} metalness={0.25} roughness={0.28} />
      </mesh>
      <mesh position={[-0.405, 0.34, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.62, 0.025, 0.92]} />
        <meshStandardMaterial color={glass} metalness={0.25} roughness={0.28} />
      </mesh>
      {/* Aileron and elevator panels move with the arcade attitude. */}
      <group ref={ailerons}>
        <mesh position={[4.55, 0.62, 0.9]} rotation={[0.03, 0, 0]}>
          <boxGeometry args={[2.15, 0.055, 0.32]} />
          <meshStandardMaterial color={trim} roughness={0.6} />
        </mesh>
        <mesh position={[-4.55, 0.62, 0.9]} rotation={[-0.03, 0, 0]}>
          <boxGeometry args={[2.15, 0.055, 0.32]} />
          <meshStandardMaterial color={trim} roughness={0.6} />
        </mesh>
      </group>
      <group ref={elevator} position={[0, 0.37, 3.1]}>
        <mesh position={[0, 0, 0.25]}>
          <boxGeometry args={[3.1, 0.06, 0.38]} />
          <meshStandardMaterial color={trim} roughness={0.58} />
        </mesh>
      </group>
      {/* Landing wheels are ornamental; ground handling is an arcade constraint. */}
      {[[-1.42, -0.7, 0.65], [1.42, -0.7, 0.65], [0, -0.55, -2.15]].map((p, index) => (
        <group key={index} position={p as [number, number, number]}>
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, index === 2 ? 0.1 : -0.14]}>
            <cylinderGeometry args={[0.045, 0.045, 0.64, 8]} />
            <meshStandardMaterial color="#9eabb0" metalness={0.65} roughness={0.42} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.16, 16]} />
            <meshStandardMaterial color={rubber} roughness={0.92} />
          </mesh>
        </group>
      ))}
      {/* Propeller animation is visual feedback for the game's power switch. */}
      <group ref={propeller} position={[0, 0.2, -3.78]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.11, 0.28, 14]} />
          <meshStandardMaterial color="#4f626b" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.16, 2.25, 0.07]} />
          <meshStandardMaterial color="#252e34" metalness={0.55} roughness={0.36} />
        </mesh>
      </group>
      <mesh position={[6.12, 0.72, 0.02]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#70c9a4" />
      </mesh>
      <mesh position={[-6.12, 0.72, 0.02]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#d96e64" />
      </mesh>
    </group>
  );
}
