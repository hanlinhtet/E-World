'use client';
import { useEffect } from 'react';
import { apiFetch, refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { MeResponse } from '@eworld/shared';

/** On mount, try to silently restore a session via the refresh cookie. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setStatus = useAuthStore((s) => s.setStatus);
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const profile = await apiFetch<MeResponse>('/player/me');
        if (cancelled) return;
        setProfile(profile);
        setStatus('authenticated');
      } catch {
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setStatus, setProfile]);

  return <>{children}</>;
}
