'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useBreathsStore, type Breath } from '@/store/breaths.store';
import { damageArea } from './Projectiles';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const STEPS = 36;
const TICK_MS = 200;

/** Renders active Dragon's Breath flame fields and applies their burn damage. */
export function DragonBreath() {
  const breaths = useBreathsStore((s) => s.breaths);
  return (
    <>
      {breaths.map((b) => (
        <BreathField key={b.id} breath={b} />
      ))}
    </>
  );
}

function BreathField({ breath }: { breath: Breath }) {
  const flameMat = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);

  // Build the terrain-conforming strip geometry once (the field is stationary).
  const { geometry, cones } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array((STEPS + 1) * 2 * 3);
    const index: number[] = [];
    const px = -breath.dz; // perpendicular
    const pz = breath.dx;
    const halfW = breath.width / 2;
    const conePts: [number, number, number][] = [];
    for (let i = 0; i <= STEPS; i++) {
      const s = 1.5 + (i / STEPS) * breath.length;
      const cx = breath.ox + breath.dx * s;
      const cz = breath.oz + breath.dz * s;
      const lx = cx - px * halfW;
      const lz = cz - pz * halfW;
      const rx = cx + px * halfW;
      const rz = cz + pz * halfW;
      positions[i * 6] = lx;
      positions[i * 6 + 1] = surfaceHeight(SEED, lx, lz);
      positions[i * 6 + 2] = lz;
      positions[i * 6 + 3] = rx;
      positions[i * 6 + 4] = surfaceHeight(SEED, rx, rz);
      positions[i * 6 + 5] = rz;
      if (i % 3 === 0) conePts.push([cx, surfaceHeight(SEED, cx, cz), cz]);
    }
    for (let i = 0; i < STEPS; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      index.push(a, b, d, a, d, c);
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setIndex(index);
    g.computeBoundingSphere();
    return { geometry: g, cones: conePts };
  }, [breath]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const now = performance.now();
    const t = (now - breath.start) / breath.duration;
    if (t >= 1) {
      useBreathsStore.getState().remove(breath.id);
      return;
    }
    // Flicker the flame + fade out near the end.
    const flicker = 0.55 + 0.45 * Math.abs(Math.sin(now * 0.02));
    const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    if (flameMat.current) flameMat.current.opacity = 0.7 * flicker * fade;
    if (group.current) {
      group.current.children.forEach((c, i) => {
        if (c.type === 'Mesh' && (c as THREE.Mesh).geometry.type === 'ConeGeometry') {
          const f = 0.6 + 0.5 * Math.abs(Math.sin(now * 0.03 + i));
          c.scale.set(1, f * fade, 1);
        }
      });
    }

    // Damage over time to everything in the strip.
    if (now - breath.lastTick >= TICK_MS) {
      breath.lastTick = now;
      for (let s = 2; s <= breath.length; s += 2.5) {
        const x = breath.ox + breath.dx * s;
        const z = breath.oz + breath.dz * s;
        const y = surfaceHeight(SEED, x, z) + 0.6;
        damageArea(x, y, z, breath.width / 2, breath.damage, breath.color, now);
      }
    }
  });

  return (
    <group ref={group}>
      {/* dark scorch shadow on the ground */}
      <mesh geometry={geometry} position={[0, 0.03, 0]}>
        <meshBasicMaterial color="#1a0a04" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* glowing red flame sheet */}
      <mesh geometry={geometry} position={[0, 0.18, 0]}>
        <meshBasicMaterial
          ref={flameMat}
          color={breath.color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* rising flame tongues for volume */}
      {cones.map((c, i) => (
        <mesh key={i} position={[c[0], c[1] + 0.9, c[2]]}>
          <coneGeometry args={[breath.width * 0.18, 2.2, 7]} />
          <meshBasicMaterial color={i % 2 ? '#ff7a2a' : breath.color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
