'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdmirerRegister } from '@/lib/admirer';

/**
 * Speaks a single Admirer line via /api/admirer and plays it. Renders
 * nothing visible — pair this with the visual element it accompanies.
 *
 * Idempotent per `text + register`: the route caches generated audio, and
 * this component caches blob URLs in-memory across remounts.
 */

interface AdmirerLineProps {
  text: string;
  register: AdmirerRegister;
  /** Delay before playback in ms. Default 0. */
  delayMs?: number;
  /** Volume 0..1. Default 1. */
  volume?: number;
  /** Fired when the line finishes playing. */
  onEnded?: () => void;
  /** If true, suppress audio entirely (for muted/preview modes). */
  muted?: boolean;
  /** Skip if false — useful for conditional rendering without unmounting. */
  enabled?: boolean;
}

const blobCache = new Map<string, string>();

function blobKey(text: string, register: AdmirerRegister): string {
  return `${register}::${text}`;
}

export function AdmirerLine({
  text,
  register,
  delayMs = 0,
  volume = 1,
  onEnded,
  muted = false,
  enabled = true,
}: AdmirerLineProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const startTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !text) return;

    const key = blobKey(text, register);
    const cached = blobCache.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admirer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, register }),
        });
        if (!res.ok) {
          console.warn('AdmirerLine: tts failed', await res.text());
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        blobCache.set(key, url);
        setSrc(url);
      } catch (e) {
        console.warn('AdmirerLine: fetch error', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, register, enabled]);

  useEffect(() => {
    if (!src || !audioRef.current || muted || !enabled) return;
    const audio = audioRef.current;
    audio.volume = volume;
    if (startTimerRef.current) window.clearTimeout(startTimerRef.current);
    startTimerRef.current = window.setTimeout(() => {
      audio.play().catch((e) => {
        // Browsers may block autoplay. Surface for debugging.
        console.warn('AdmirerLine: play() blocked', e);
      });
    }, Math.max(0, delayMs));
    return () => {
      if (startTimerRef.current) window.clearTimeout(startTimerRef.current);
      audio.pause();
    };
  }, [src, delayMs, volume, muted, enabled]);

  if (!src || !enabled) return null;

  return (
    <audio
      ref={audioRef}
      src={src}
      preload="auto"
      onEnded={onEnded}
      style={{ display: 'none' }}
    />
  );
}
