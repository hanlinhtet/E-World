'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePlayerStore } from '@/store/player.store';
import { useGameplayStore } from '@/store/gameplay.store';

const EYE_HEIGHT = 1.7;
const SHIRT = '#3c4d68';
const SHIRT_DARK = '#33425a';
const SKIN = '#c69472';
const PANTS = '#2b3340';
const SHOE = '#191a1f';

const UP = new THREE.Vector3(0, 1, 0);

/** A rounded segment (capsule) connecting two points in the rig's local space. */
function Segment({
  from,
  to,
  radius,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
}) {
  const { mid, quat, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    return { mid, quat, length };
  }, [from, to]);

  return (
    <mesh position={mid} quaternion={quat} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 6, 14]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function Joint({ at, r, color }: { at: [number, number, number]; r: number; color: string }) {
  return (
    <mesh position={at} castShadow>
      <sphereGeometry args={[r, 14, 12]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/**
 * The player's own first-person body — one coherent rig anchored to the camera's
 * position and YAW only (never pitch), so the head looks around while the body
 * stays upright and connected. The whole rig's highest point (the shoulders/neck)
 * sits well below the eye so it never clips the camera's near plane when you look
 * straight down. The walk bob moves the limbs and arms, NOT the head, so nothing
 * is ever pushed up into the camera.
 */
export function PlayerAvatar() {
  const { camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null); // both arms + held tool, moved as one unit

  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const lastPos = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const clock = useRef(0);

  useFrame((_, dt) => {
    if (!root.current) return;
    clock.current += dt;

    // Anchor at the feet, under the camera; yaw only so the body stays upright.
    // We set position absolutely every frame (no cumulative bob on the head).
    root.current.position.set(
      camera.position.x,
      camera.position.y - EYE_HEIGHT,
      camera.position.z,
    );
    euler.current.setFromQuaternion(camera.quaternion);
    root.current.rotation.y = euler.current.y;

    // Walk cycle from real horizontal speed.
    const p = usePlayerStore.getState().position;
    const dx = p.x - lastPos.current.x;
    const dz = p.z - lastPos.current.z;
    lastPos.current.set(p.x, p.y, p.z);
    const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
    const grounded = usePlayerStore.getState().grounded;
    const moving = grounded && speed > 0.8;

    phase.current += dt * (moving ? 2.4 * Math.PI : 0);
    const swing = moving ? Math.sin(phase.current) * 0.55 : Math.sin(clock.current * 1.5) * 0.04;

    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;

    // Arms + tool bob together (downward only); a harvest swing overrides the bob
    // with an action-specific animation. Nothing rises toward the camera.
    if (upper.current) {
      const gp = useGameplayStore.getState();
      const nowMs = performance.now();
      const u = upper.current;
      if (nowMs < gp.swingUntil) {
        const dur = gp.swingUntil - gp.swingStart || 1;
        const tn = Math.min(1, Math.max(0, (nowMs - gp.swingStart) / dur));
        const arc = Math.sin(tn * Math.PI); // 0 → 1 → 0
        if (gp.swingAction === 'chop') {
          // diagonal axe swing: down-and-across
          u.rotation.x = -arc * 1.3;
          u.rotation.z = arc * 0.3;
          u.position.set(0, 0, 0);
        } else if (gp.swingAction === 'mine') {
          // overhead pick slam: front-loaded, straight down, hard
          const slam = Math.sin(Math.pow(tn, 0.55) * Math.PI);
          u.rotation.x = -slam * 1.55;
          u.rotation.z = 0;
          u.position.set(0, 0, 0);
        } else {
          // light bush jab: small forward poke
          u.rotation.x = -arc * 0.45;
          u.rotation.z = 0;
          u.position.set(0, 0, -arc * 0.22);
        }
      } else {
        const b = moving ? Math.abs(Math.sin(phase.current * 2)) : 0;
        u.rotation.x = moving ? Math.sin(phase.current * 2) * 0.04 : 0;
        u.rotation.z = 0;
        u.position.set(0, -b * 0.03, 0);
      }
    }
  });

  return (
    <group ref={root}>
      {/* ── Torso + pelvis (top of the rig ≈ 1.5 m, well below the 1.7 m eye) ── */}
      <Segment from={[0, 0.92, 0]} to={[0, 1.36, 0]} radius={0.16} color={SHIRT} />
      <Joint at={[0, 1.38, 0]} r={0.11} color={SHIRT} />
      <Segment from={[-0.11, 0.92, 0]} to={[0.11, 0.92, 0]} radius={0.13} color={SHIRT_DARK} />

      {/* ── Arms + held pickaxe, moved together by `upper` ── */}
      <group ref={upper}>
        {/* Right arm */}
        <group position={[0.22, 1.36, 0]}>
          <Joint at={[0, 0, 0]} r={0.1} color={SHIRT} />
          <Segment from={[0, 0, 0]} to={[0.06, -0.16, -0.16]} radius={0.07} color={SHIRT} />
          <Joint at={[0.06, -0.16, -0.16]} r={0.065} color={SHIRT} />
          <Segment from={[0.06, -0.16, -0.16]} to={[-0.1, -0.06, -0.46]} radius={0.06} color={SKIN} />
          <mesh position={[-0.1, -0.06, -0.48]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 0.09, 0.13]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>

        {/* Left arm */}
        <group position={[-0.22, 1.36, 0]}>
          <Joint at={[0, 0, 0]} r={0.1} color={SHIRT} />
          <Segment from={[0, 0, 0]} to={[-0.06, -0.16, -0.16]} radius={0.07} color={SHIRT} />
          <Joint at={[-0.06, -0.16, -0.16]} r={0.065} color={SHIRT} />
          <Segment from={[-0.06, -0.16, -0.16]} to={[0.1, -0.06, -0.46]} radius={0.06} color={SKIN} />
          <mesh position={[0.1, -0.06, -0.48]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 0.09, 0.13]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>

        {/* Magic wand: wooden shaft + glowing gem, held in the right hand */}
        <Segment from={[0.08, 1.26, -0.42]} to={[0.17, 1.52, -0.82]} radius={0.022} color="#5a3d24" />
        <mesh position={[0.17, 1.52, -0.82]} castShadow>
          <icosahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color="#8fe0ff" emissive="#3aa0ff" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <pointLight position={[0.17, 1.52, -0.82]} color="#5ab8ff" intensity={1.4} distance={3.5} />
      </group>

      {/* ── Legs (pivot at hips; feet land at ground level) ── */}
      <group ref={legL} position={[-0.11, 0.92, 0]}>
        <Joint at={[0, 0, 0]} r={0.11} color={SHIRT_DARK} />
        <Segment from={[0, 0, 0]} to={[0, -0.42, 0]} radius={0.1} color={PANTS} />
        <Joint at={[0, -0.42, 0]} r={0.09} color={PANTS} />
        <Segment from={[0, -0.42, 0]} to={[0, -0.82, 0]} radius={0.085} color={PANTS} />
        <mesh position={[0, -0.86, 0.06]} castShadow>
          <boxGeometry args={[0.17, 0.12, 0.3]} />
          <meshStandardMaterial color={SHOE} roughness={0.7} />
        </mesh>
      </group>
      <group ref={legR} position={[0.11, 0.92, 0]}>
        <Joint at={[0, 0, 0]} r={0.11} color={SHIRT_DARK} />
        <Segment from={[0, 0, 0]} to={[0, -0.42, 0]} radius={0.1} color={PANTS} />
        <Joint at={[0, -0.42, 0]} r={0.09} color={PANTS} />
        <Segment from={[0, -0.42, 0]} to={[0, -0.82, 0]} radius={0.085} color={PANTS} />
        <mesh position={[0, -0.86, 0.06]} castShadow>
          <boxGeometry args={[0.17, 0.12, 0.3]} />
          <meshStandardMaterial color={SHOE} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
