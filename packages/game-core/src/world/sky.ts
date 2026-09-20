/**
 * Sky / day-night model. A pure function of the day fraction (0..1, where 0 is
 * midnight). The client drives this from the player's *local* timezone; the
 * server uses it to gate time-of-day logic (shop hours, night monsters).
 */
import { TimePhase, type SkyState, type Vec3 } from '@eworld/shared';

/** Convert a JS Date in the user's locale to a 0..1 fraction of the day. */
export function dayFractionFromDate(date: Date): number {
  const secondsIntoDay =
    date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  return secondsIntoDay / 86400;
}

export function phaseFor(dayFraction: number): TimePhase {
  const h = dayFraction * 24;
  if (h < 1 || h >= 23) return TimePhase.Midnight;
  if (h < 6.5) return TimePhase.Night;
  if (h < 8.5) return TimePhase.Sunrise;
  if (h < 12) return TimePhase.Morning;
  if (h < 17) return TimePhase.Afternoon;
  if (h < 19.5) return TimePhase.Sunset;
  return TimePhase.Night;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function mix3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const NIGHT_SKY: [number, number, number] = [0.02, 0.03, 0.08];
const DAY_SKY: [number, number, number] = [0.35, 0.6, 0.95];
const DUSK_SKY: [number, number, number] = [0.85, 0.4, 0.25];

/** Compute the full sky state for a given day fraction. */
export function computeSky(dayFraction: number): SkyState {
  // Sun angle: highest at noon (0.5), below horizon at night.
  const sunAngle = (dayFraction - 0.25) * Math.PI * 2; // sunrise ~0.25
  const sunHeight = Math.sin(sunAngle); // -1..1
  const daylight = clamp01(sunHeight * 1.4 + 0.15);

  const sunDirection: Vec3 = {
    x: Math.cos(sunAngle),
    y: sunHeight,
    z: 0.2,
  };
  const moonDirection: Vec3 = { x: -sunDirection.x, y: -sunDirection.y, z: -0.2 };

  // Dusk/dawn reddening peaks when the sun is near the horizon.
  const horizonGlow = clamp01(1 - Math.abs(sunHeight) * 4);
  let skyColor = mix3(NIGHT_SKY, DAY_SKY, daylight);
  skyColor = mix3(skyColor, DUSK_SKY, horizonGlow * 0.7);

  return {
    dayFraction,
    phase: phaseFor(dayFraction),
    sunDirection,
    moonDirection,
    skyColor,
    fogColor: mix3([0.05, 0.06, 0.1], [0.7, 0.8, 0.9], daylight),
    fogDensity: mix(0.004, 0.0015, daylight),
    starIntensity: clamp01(1 - daylight * 2),
    sunIntensity: daylight * 3,
  };
}
