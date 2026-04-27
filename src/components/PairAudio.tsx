'use client';

import { useEffect, useRef } from 'react';

/**
 * Plays the two pair clips for a Phase 1 pair.
 *
 * Behaviour: on mount, plays clip A from the start. When the user hovers
 * the other side, switches mid-play to that clip (the hover side becomes
 * the current preview). On commit, the chosen side keeps playing for the
 * brief acknowledgement window before the next pair loads.
 *
 * Both clips are pre-generated 8s instrumental excerpts in
 * `/public/audio/pairs/{axis}_{a|b}.mp3`. Renders nothing visible.
 */

interface PairAudioProps {
  axis: string;
  hoverSide: 'a' | 'b' | null;
  chosenSide: 'a' | 'b' | null;
  /** Reset trigger — increment per pair so audio restarts on new pair. */
  resetKey: number;
  /** Master volume 0..1. Default 0.55. */
  volume?: number;
}

export function PairAudio({
  axis,
  hoverSide,
  chosenSide,
  resetKey,
  volume = 0.55,
}: PairAudioProps) {
  const aRef = useRef<HTMLAudioElement | null>(null);
  const bRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);

  // Reset both audios on pair change. Auto-start clip A.
  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    a.currentTime = 0;
    b.currentTime = 0;
    a.volume = volume;
    b.volume = 0;
    const playA = a.play();
    if (playA && playA.catch) playA.catch(() => {});
    return () => {
      a.pause();
      b.pause();
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, [resetKey, volume]);

  // Crossfade based on hover or commit.
  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    const targetSide: 'a' | 'b' | null = chosenSide ?? hoverSide;

    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);

    if (!targetSide) {
      // No hover and not committed — keep playing A as default.
      ramp(a, volume, 280);
      ramp(b, 0, 280);
      ensurePlaying(a);
      return;
    }

    if (targetSide === 'a') {
      ramp(a, volume, 280);
      ramp(b, 0, 280);
      ensurePlaying(a);
    } else {
      ramp(b, volume, 280);
      ramp(a, 0, 280);
      ensurePlaying(b);
    }

    function ramp(audio: HTMLAudioElement, target: number, ms: number) {
      const start = performance.now();
      const startVol = audio.volume;
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / ms);
        audio.volume = startVol + (target - startVol) * t;
        if (t < 1) fadeRafRef.current = requestAnimationFrame(tick);
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    }

    function ensurePlaying(audio: HTMLAudioElement) {
      if (audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }, [hoverSide, chosenSide, volume]);

  return (
    <>
      <audio
        ref={aRef}
        src={`/audio/pairs/${axis}_a.mp3`}
        preload="auto"
        loop
        style={{ display: 'none' }}
      />
      <audio
        ref={bRef}
        src={`/audio/pairs/${axis}_b.mp3`}
        preload="auto"
        loop
        style={{ display: 'none' }}
      />
    </>
  );
}
