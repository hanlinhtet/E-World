import { describe, expect, it } from 'vitest';
import { computeSky, phaseFor } from './sky';
import { TimePhase } from '@eworld/shared';

describe('sky model', () => {
  it('is deterministic', () => {
    expect(computeSky(0.5)).toEqual(computeSky(0.5));
  });

  it('puts the sun above the horizon at noon and below at midnight', () => {
    expect(computeSky(0.5).sunDirection.y).toBeGreaterThan(0.5);
    expect(computeSky(0.0).sunDirection.y).toBeLessThan(0);
  });

  it('classifies day phases', () => {
    expect(phaseFor(0.5)).toBe(TimePhase.Afternoon);
    expect(phaseFor(0.0)).toBe(TimePhase.Midnight);
  });

  it('shows stars at night, not during the day', () => {
    expect(computeSky(0.0).starIntensity).toBeGreaterThan(0.5);
    expect(computeSky(0.5).starIntensity).toBe(0);
  });
});
