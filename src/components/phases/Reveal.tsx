'use client';

import { useEffect, useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { scoreArchetypes } from '@/lib/scoring';

/**
 * Recognition / Reveal — Aristotelian anagnorisis. 3–5s of full silence
 * before the first note, then the generated title appears, then a single
 * ink line is drawn under it as the music is meant to begin.
 *
 * In this prototype the title is the matched archetype's variation tag
 * (e.g. "Lo-fi piano · 2010s"). Replace with the real generated title once
 * the ElevenLabs Music pipeline is wired in.
 */

const T_SILENCE = 3500;
const T_TITLE = T_SILENCE + 0;
const T_UNDERLINE = T_SILENCE + 2200;
const T_HANDOFF = T_SILENCE + 4500;
const T_NEXT = T_SILENCE + 7000;

export function Reveal() {
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const setPhase = useStore((s) => s.setPhase);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = () => setNow(performance.now() - start);
    const id = window.setInterval(tick, 80);
    const advance = window.setTimeout(() => setPhase(8), T_NEXT);
    return () => {
      clearInterval(id);
      clearTimeout(advance);
    };
  }, [setPhase]);

  const top = scoreArchetypes(pairChoices, pairLatencies, emotionTiles)[0];
  const title = top?.variation ?? 'A piece for you';

  const showTitle = now >= T_TITLE;
  const drawLine = now >= T_UNDERLINE;
  const showHandoff = now >= T_HANDOFF;

  return (
    <Paper variant="cream">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <h1
          style={{
            fontFamily: FONTS.serif,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(34px, 7vw, 52px)',
            color: COLORS.inkCream,
            textAlign: 'center',
            lineHeight: 1.15,
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.6s ease-out, transform 1.6s ease-out',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <svg width="200" height="6" viewBox="0 0 200 6" style={{ marginTop: 24 }}>
          <line
            x1="2"
            y1="3"
            x2="198"
            y2="3"
            stroke={COLORS.scoreAmber}
            strokeWidth="0.9"
            strokeLinecap="round"
            style={{
              strokeDasharray: 200,
              strokeDashoffset: drawLine ? 0 : 200,
              transition: 'stroke-dashoffset 1.8s ease-in-out',
            }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p
          style={{
            marginTop: 28,
            fontFamily: FONTS.serif,
            fontStyle: 'italic',
            fontSize: 16,
            color: COLORS.inkCreamSecondary,
            opacity: showHandoff ? 0.85 : 0,
            transition: 'opacity 1.4s ease-out',
            textAlign: 'center',
          }}
        >
          I made this for you.
        </p>
      </div>
    </Paper>
  );
}
