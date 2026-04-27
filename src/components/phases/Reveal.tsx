'use client';

import { useEffect, useMemo, useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { computeAVD, pickVariation, scoreArchetypes } from '@/lib/scoring';

/**
 * Format the temporal-uniqueness caption per stealable-techniques §10.
 * "This piece was composed at [timestamp]. It has never existed before."
 * — Mubert/generative-AI move; concrete time signatures make uniqueness real.
 */
function formatTimestamp(d: Date): string {
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${time} on ${date}`;
}

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
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);
  const userName = useStore((s) => s.userName);
  const setPhase = useStore((s) => s.setPhase);

  const composedAt = useMemo(() => formatTimestamp(new Date()), []);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = () => setNow(performance.now() - start);
    const id = window.setInterval(tick, 80);
    const advance = window.setTimeout(() => setPhase(9), T_NEXT);
    return () => {
      clearInterval(id);
      clearTimeout(advance);
    };
  }, [setPhase]);

  const top = scoreArchetypes(pairChoices, pairLatencies, emotionTiles)[0];
  const variation = top
    ? pickVariation(top, {
        avd: computeAVD(pairChoices, pairLatencies).vector,
        songYears: songYears.filter((y): y is number => !!y),
        tapBPM,
        emotionTiles: emotionTiles.flat(),
        epsilon: 0,
      })
    : null;
  const title = variation?.tag ?? 'A piece for you';

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

        {/* Temporal uniqueness frame — Mubert / generative-AI idiom per
            stealable-techniques §10. Concrete time signature makes the
            uniqueness claim feel earned. */}
        <p
          style={{
            position: 'absolute',
            bottom: 36,
            left: 32,
            right: 32,
            margin: 0,
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: 9,
            letterSpacing: '0.18em',
            color: COLORS.inkCreamSecondary,
            opacity: showHandoff ? 0.65 : 0,
            transition: 'opacity 1.8s 0.6s ease-out',
            lineHeight: 1.7,
          }}
        >
          composed at {composedAt}
          {userName ? <> · for {userName.toLowerCase()}</> : null}
          <br />
          has never existed before
        </p>
      </div>
    </Paper>
  );
}
