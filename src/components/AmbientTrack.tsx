'use client';

import { useEffect, useRef } from 'react';

/**
 * Plays a static audio file as ambient backing. Supports volume + fade-in
 * + automatic loop. Renders nothing visible. Used for Phase 4 audition
 * track (one per archetype × variation, pre-generated).
 */

interface AmbientTrackProps {
  src: string;
  volume?: number;
  fadeInMs?: number;
  loop?: boolean;
  enabled?: boolean;
}

export function AmbientTrack({
  src,
  volume = 0.6,
  fadeInMs = 800,
  loop = true,
  enabled = true,
}: AmbientTrackProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = loop;
    audio.volume = 0;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked. The visual still works; audio simply doesn't.
    });

    // Smooth fade-in via JS (Audio API has no built-in volume ramp).
    const start = performance.now();
    let raf: number | null = null;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / fadeInMs);
      audio.volume = volume * t;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      audio.pause();
    };
  }, [src, volume, fadeInMs, loop, enabled]);

  if (!enabled) return null;

  return <audio ref={audioRef} src={src} preload="auto" style={{ display: 'none' }} />;
}
