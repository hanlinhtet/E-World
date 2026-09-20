'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useCombatStore } from '@/store/combat.store';
import { spellDef, chargeFraction, BREATH_GROW } from './spells';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const STEPS = 40;

/** Terrain-conforming flame strip showing Dragon's Breath area while holding X.
 *  Grows longer the longer you hold. */
export function BreathMarker() {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const dir = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((STEPS + 1) * 2 * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < STEPS; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      index.push(a, b, d, a, d, c);
    }
    g.setIndex(index);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const combat = useCombatStore.getState();
    const def = combat.chargingSpell ? spellDef(combat.chargingSpell) : undefined;
    if (!combat.chargeStart || !def || def.castType !== 'breath') {
      m.visible = false;
      return;
    }
    m.visible = true;
    const charge = chargeFraction(performance.now() - combat.chargeStart);
    const length = (def.length ?? 14) * (1 + charge * BREATH_GROW);
    const halfW = (def.width ?? 5) / 2;

    camera.getWorldDirection(dir.current).normalize();
    const fx = dir.current.x;
    const fz = dir.current.z;
    const flen = Math.hypot(fx, fz) || 1;
    const dx = fx / flen;
    const dz = fz / flen;
    const px = -dz; // perpendicular
    const pz = dx;
    const ox = camera.position.x;
    const oz = camera.position.z;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= STEPS; i++) {
      const s = 1.5 + (i / STEPS) * length;
      const cx = ox + dx * s;
      const cz = oz + dz * s;
      const lx = cx - px * halfW;
      const lz = cz - pz * halfW;
      const rx = cx + px * halfW;
      const rz = cz + pz * halfW;
      pos.setXYZ(i * 2, lx, surfaceHeight(SEED, lx, lz) + 0.07, lz);
      pos.setXYZ(i * 2 + 1, rx, surfaceHeight(SEED, rx, rz) + 0.07, rz);
    }
    pos.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  return (
    <mesh ref={mesh} geometry={geometry} visible={false}>
      <meshBasicMaterial color="#ff6320" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
