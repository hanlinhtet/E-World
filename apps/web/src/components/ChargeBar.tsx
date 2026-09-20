'use client';
import { useEffect, useState } from 'react';
import { useCombatStore } from '@/store/combat.store';
import { chargeFraction } from '@/game/spells';

/** Thin charge meter under the crosshair while holding to cast. */
export function ChargeBar() {
  const [frac, setFrac] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cs = useCombatStore.getState().chargeStart;
      setFrac(cs ? chargeFraction(performance.now() - cs) : 0);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (frac <= 0) return null;
  return (
    <div className="absolute left-1/2 top-[calc(50%+30px)] h-1.5 w-28 -translate-x-1/2 overflow-hidden rounded-full bg-white/20">
      <div
        className={`h-full rounded-full ${frac >= 1 ? 'bg-red-400' : 'bg-amber-300'}`}
        style={{ width: `${frac * 100}%` }}
      />
    </div>
  );
}
