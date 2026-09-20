'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { googleLoginUrl } from '@/lib/api';

export default function LandingPage() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a1020] via-[#0c1428] to-[#05060a]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="glass flex w-[min(92vw,460px)] flex-col items-center gap-6 rounded-3xl p-10 text-center"
      >
        <h1 className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
          E-World
        </h1>
        <p className="text-sm leading-relaxed text-white/70">
          A living open world. Explore, mine, craft, fight, and master the elements —
          all in your browser, in first person.
        </p>

        {status === 'authenticated' && profile ? (
          <Link
            href="/play"
            className="w-full rounded-xl bg-emerald-400/90 py-3 font-semibold text-black transition hover:bg-emerald-300"
          >
            Enter World →
          </Link>
        ) : (
          <a
            href={googleLoginUrl}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-white/90"
          >
            <span className="text-lg">G</span> Continue with Google
          </a>
        )}

        <p className="text-xs text-white/40">
          {status === 'loading' ? 'Restoring session…' : 'Phase 0 · Foundation build'}
        </p>
      </motion.div>
    </main>
  );
}
