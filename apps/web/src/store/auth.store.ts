import { create } from 'zustand';
import type { MeResponse } from '@eworld/shared';

interface AuthState {
  accessToken: string | null;
  profile: MeResponse | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setAccessToken: (token: string | null) => void;
  setProfile: (profile: MeResponse | null) => void;
  setStatus: (status: AuthState['status']) => void;
  logout: () => void;
}

/** Client auth state. The access token lives in memory only; the refresh token
 *  is an httpOnly cookie the server manages. */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  profile: null,
  status: 'idle',
  setAccessToken: (accessToken) => set({ accessToken }),
  setProfile: (profile) => set({ profile }),
  setStatus: (status) => set({ status }),
  logout: () => set({ accessToken: null, profile: null, status: 'unauthenticated' }),
}));
