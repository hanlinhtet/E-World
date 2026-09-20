'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCombatStore } from '@/store/combat.store';
import { spellDef, chargeFraction } from './spells';

/** A glowing orb in front of the player that grows as the spell charges. */
export function ChargeOrb() {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const dir = useRef(new THREE.Vector3());
  const color = useRef(new THREE.Color('#ffffff'));

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const combat = useCombatStore.getState();
    const def = combat.chargingSpell ? spellDef(combat.chargingSpell) : undefined;

    if (!combat.chargeStart || !def || (def.castType !== 'projectile' && def.castType !== 'arc')) {
      m.visible = false;
      if (light.current) light.current.intensity = 0;
      return;
    }
    m.visible = true;
    const charge = chargeFraction(performance.now() - combat.chargeStart);

    // Hold the orb a bit in front of and below the camera (in the hands).
    camera.getWorldDirection(dir.current).normalize();
    m.position.set(
      camera.position.x + dir.current.x * 0.9,
      camera.position.y + dir.current.y * 0.9 - 0.25,
      camera.position.z + dir.current.z * 0.9,
    );
    const r = (def.radius ?? 1) * (0.4 + charge * 0.9);
    m.scale.setScalar(r);
    color.current.set(def.color);
    (m.material as THREE.MeshStandardMaterial).color.copy(color.current);
    (m.material as THREE.MeshStandardMaterial).emissive.copy(color.current);

    if (light.current) {
      light.current.position.copy(m.position);
      light.current.color.copy(color.current);
      light.current.intensity = 2 + charge * 5;
    }
  });

  return (
    <>
      <mesh ref={mesh} visible={false}>
        <sphereGeometry args={[1, 16, 14]} />
        <meshStandardMaterial emissiveIntensity={2.6} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight ref={light} intensity={0} distance={7} />
    </>
  );
}
