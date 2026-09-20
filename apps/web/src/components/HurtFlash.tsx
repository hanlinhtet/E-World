'use client';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/player.store';

const FLASH_MS = 350;

/** Red vignette that pulses when the player takes damage. */
export function HurtFlash() {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const hurtAt = usePlayerStore.getState().hurtAt;
      const dt = performance.now() - hurtAt;
      setOpacity(dt < FLASH_MS ? 0.5 * (1 - dt / FLASH_MS) : 0);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (opacity <= 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        opacity,
        boxShadow: 'inset 0 0 180px 60px rgba(220,30,30,0.9)',
        transition: 'opacity 60ms linear',
      }}
    />
  );
}
