'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { NPCS } from './npcs';
import { useUiStore } from '@/store/ui.store';

const TALK_RANGE = 3.8;

/** Detects the nearest NPC in talk range and publishes it for the "[E] Talk"
 *  prompt. The E key itself is handled in Combat (E = talk if near an NPC,
 *  otherwise switch spell). */
export function NpcInteraction() {
  const { camera } = useThree();

  useFrame(() => {
    const px = camera.position.x;
    const pz = camera.position.z;
    let best: string | null = null;
    let bestD = TALK_RANGE * TALK_RANGE;
    for (const n of NPCS) {
      const dx = n.x - px;
      const dz = n.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) {
        bestD = d2;
        best = n.id;
      }
    }
    useUiStore.getState().setNearNpc(best);
  });

  return null;
}
