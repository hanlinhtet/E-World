'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useCombatStore } from '@/store/combat.store';
import { spellDef, chargeFraction, ARC_GROW } from './spells';
import { aimGroundPoint } from './aim';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const SEG = 64;
const HALF_W = 0.2; // ring band half-width (bolder border)

/**
 * Bold ground ring showing where Meteor Arc will land. Built as a thin band
 * (triangle pairs) whose every vertex is snapped to the terrain height, so it
 * hugs uneven ground smoothly. Center uses the SAME aim function as the cast,
 * so the mark and the impact are always the same spot.
 */
export function TargetMarker() {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const dir = useRef(new THREE.Vector3());
  const center = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < SEG; i++) {
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
    const key = combat.chargingSpell;
    const def = key ? spellDef(key) : undefined;
    const grounded = def && ['arc', 'updraft', 'tornado', 'geyser', 'thunder', 'storm'].includes(def.castType);
    if (!def || !grounded || !combat.chargeStart) {
      m.visible = false;
      return;
    }
    m.visible = true;

    camera.getWorldDirection(dir.current).normalize();
    aimGroundPoint(camera, dir.current, center.current);
    const cx = center.current.x;
    const cz = center.current.z;
    // Grow the ring as it charges (only the meteor grows with charge).
    const frac = def.castType === 'arc' ? chargeFraction(performance.now() - combat.chargeStart) : 0;
    const r = (def.aoe ?? 2.6) * (1 + frac * ARC_GROW);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= SEG; i++) {
      const ang = (i / SEG) * Math.PI * 2;
      const ix = cx + Math.cos(ang) * (r - HALF_W);
      const iz = cz + Math.sin(ang) * (r - HALF_W);
      const ox = cx + Math.cos(ang) * (r + HALF_W);
      const oz = cz + Math.sin(ang) * (r + HALF_W);
      pos.setXYZ(i * 2, ix, surfaceHeight(SEED, ix, iz) + 0.07, iz);
      pos.setXYZ(i * 2 + 1, ox, surfaceHeight(SEED, ox, oz) + 0.07, oz);
    }
    pos.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  return (
    <mesh ref={mesh} geometry={geometry} visible={false}>
      <meshBasicMaterial color="#ff5a2a" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
