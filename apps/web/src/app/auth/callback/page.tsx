'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { MeResponse } from '@eworld/shared';

/** Google redirects here with `#access_token=…`. Capture it, load the profile,
 *  and head into the game. The refresh token is already set as an httpOnly cookie. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAccessToken, setProfile, setStatus } = useAuthStore();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('access_token');
    if (!token) {
      router.replace('/');
      return;
    }
    setAccessToken(token);
    (async () => {
      try {
        const profile = await apiFetch<MeResponse>('/player/me');
        setProfile(profile);
        setStatus('authenticated');
        router.replace('/play');
      } catch {
        setStatus('unauthenticated');
        router.replace('/');
      }
    })();
  }, [router, setAccessToken, setProfile, setStatus]);

  return (
    <main className="flex h-screen items-center justify-center text-white/70">
      Signing you in…
    </main>
  );
}
