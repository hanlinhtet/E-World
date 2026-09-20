import { create } from 'zustand';
import { computeSky, dayFractionFromDate } from '@eworld/game-core';
import type { SkyState, WeatherState } from '@eworld/shared';
import { WeatherKind } from '@eworld/shared';

interface WorldState {
  sky: SkyState;
  weather: WeatherState;
  /** Recompute sky from the player's LOCAL clock (drives the day/night cycle). */
  tickTime: (now: Date) => void;
  setWeather: (weather: WeatherState) => void;
}

const initialSky = computeSky(dayFractionFromDate(new Date(0)));

export const useWorldStore = create<WorldState>((set) => ({
  sky: initialSky,
  weather: { kind: WeatherKind.Sunny, intensity: 0, windDirection: 0, windSpeed: 1 },
  tickTime: (now) => set({ sky: computeSky(dayFractionFromDate(now)) }),
  setWeather: (weather) => set({ weather }),
}));
