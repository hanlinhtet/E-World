'use client';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/player.store';

const LIFE = 1200; // ms

interface Mark {
  id: number;
  deg: number; // screen-relative angle (0 = ahead/top)
  opacity: number;
}

/** Red arcs around the crosshair pointing toward where attacks are coming from. */
export function HitIndicators() {
  const [marks, setMarks] = useState<Mark[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const { hits, look } = usePlayerStore.getState();
      const next: Mark[] = [];
      for (const h of hits) {
        const age = now - h.at;
        if (age >= LIFE) continue;
        // world angle → screen-relative (subtract player heading)
        const deg = ((h.angle - look.yaw) * 180) / Math.PI;
        next.push({ id: h.id, deg, opacity: 1 - age / LIFE });
      }
      setMarks(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (marks.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2">
      {marks.map((m) => (
        <div
          key={m.id}
          className="absolute left-0 top-0"
          style={{ transform: `rotate(${m.deg}deg)`, opacity: m.opacity }}
        >
          <div
            style={{
              transform: 'translate(-50%, -135px)',
              width: 70,
              height: 16,
              borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              background: 'linear-gradient(to top, rgba(255,40,40,0.85), rgba(255,40,40,0))',
            }}
          />
        </div>
      ))}
    </div>
  );
}
