'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Hud } from '@/components/Hud';

// The 3D canvas is client-only and heavy — load it without SSR.
const GameCanvas = dynamic(() => import('@/game/GameCanvas').then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center">Loading world…</div>,
});

export default function PlayPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && accessToken) {
      connectSocket(accessToken);
      return () => disconnectSocket();
    }
  }, [status, accessToken]);

  if (status !== 'authenticated') {
    return <main className="flex h-screen items-center justify-center text-white/60">Loading…</main>;
  }

  return (
    <main className="relative h-screen w-screen">
      <GameCanvas />
      <Hud />
    </main>
  );
}
