'use client';

import { useEffect, useRef } from 'react';

/**
 * Sub-music drone — single sine tone at the specified frequency. 60Hz is
 * the Phase 0 default, defended in Bernardi, Porta & Sleight (2006, *Heart*
 * 92:445): silence between musical pauses outperforms calming music for
 * parasympathetic shift. The drone is *not music* — it grounds presence
 * below the music-processing system.
 *
 * Pure Web Audio. No API call. Renders nothing visually. Fades in over
 * `fadeInMs` on mount, fades out over `fadeOutMs` on unmount.
 */

interface DroneProps {
  freq?: number;
  /** Peak gain — 0..1. Default very low (sub-presence). */
  gain?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
}

export function Drone({
  freq = 60,
  gain = 0.06,
  fadeInMs = 1800,
  fadeOutMs = 1200,
}: DroneProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    type AC = typeof AudioContext;
    const Ctx: AC | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
        : undefined;
    if (!Ctx) return;

    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = 0;

    osc.connect(g);
    g.connect(ctx.destination);

    // Resume the context if it's been auto-suspended (browser autoplay policy).
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    osc.start();
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + fadeInMs / 1000);

    ctxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = g;

    return () => {
      const fadeSec = fadeOutMs / 1000;
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);
        osc.stop(ctx.currentTime + fadeSec + 0.05);
        // Track the close timer so a rapid remount (StrictMode in dev,
        // or fast phase navigation) can cancel a pending close before it
        // fires on a context that's already been replaced.
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          ctx.close().catch(() => {});
        }, fadeOutMs + 100);
      } catch {
        try { ctx.close(); } catch {}
      }
    };
  }, [freq, gain, fadeInMs, fadeOutMs]);

  // Final unmount: cancel any pending close timer and best-effort close.
  // The effect above runs its cleanup before this on rapid remount, but a
  // genuine unmount of the parent should still tear everything down.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  return null;
}
