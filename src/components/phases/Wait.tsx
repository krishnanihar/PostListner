'use client';

import { useEffect, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { BreathPacer } from '@/score/BreathPacer';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';

const ACTS = [
  { i: 'i.',   line: 'listening to your spectrum…' },
  { i: 'ii.',  line: 'weighing the songs you carry…' },
  { i: 'iii.', line: 'setting it down.' },
];

const ACT_DURATIONS = [60_000, 90_000, 60_000]; // 1m + 1m30s + 1m  ≈ 3m30s total
const TOTAL = ACT_DURATIONS.reduce((s, x) => s + x, 0);

export function Wait() {
  const setPhase = useStore((s) => s.setPhase);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e >= TOTAL) {
        clearInterval(id);
        setPhase(8);
      }
    }, 200);
    return () => clearInterval(id);
  }, [setPhase]);

  // Determine current act
  let acc = 0;
  let actIdx = 0;
  let actProgress = 0;
  for (let i = 0; i < ACT_DURATIONS.length; i++) {
    if (elapsed < acc + ACT_DURATIONS[i]) {
      actIdx = i;
      actProgress = (elapsed - acc) / ACT_DURATIONS[i];
      break;
    }
    acc += ACT_DURATIONS[i];
    actIdx = i + 1;
  }
  if (actIdx >= ACTS.length) actIdx = ACTS.length - 1;

  // Backward-ribbed progress: stave fills from right to left, perceptually
  // accelerates near completion (Harrison et al. 2010).
  const overall = Math.min(1, elapsed / TOTAL);
  const easedOverall = 1 - Math.pow(1 - overall, 1.4);
  const filledX = MARGIN_X + (VB_W - MARGIN_X * 2) * (1 - easedOverall);
  const PROGRESS_Y = 540;

  return (
    <Score
      variant="cream"
      pageTitle="vii. composing"
      pageNumber="—"
      voiceCue="breathe with the line. it is being made."
      footer="generation · stage · ritual"
    >
      {/* Breath pacer at upper-third — the eye returns to this */}
      <g transform={`translate(${VB_W / 2}, 200)`}>
        <BreathPacer bpm={5.5} size={80} color={COLORS.inkCream} opacity={0.85} />
      </g>

      {/* Three acts, struck through as they complete */}
      {ACTS.map((act, i) => {
        const completed = i < actIdx;
        const active = i === actIdx;
        const upcoming = i > actIdx;
        const opacity = upcoming ? 0.25 : 1;
        const y = 320 + i * 32;
        const text = `${act.i}  ${act.line}`;
        return (
          <g key={i} opacity={opacity}>
            <text
              x={MARGIN_X}
              y={y}
              fill={active ? COLORS.scoreAmber : COLORS.inkCream}
              fontSize="14"
              fontFamily={FONTS.serif}
              fontStyle="italic"
            >
              {text}
            </text>
            {completed && (
              <line
                x1={MARGIN_X}
                y1={y - 4}
                x2={VB_W - MARGIN_X}
                y2={y - 4}
                stroke={COLORS.inkCreamSecondary}
                strokeWidth="0.7"
                opacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}

      {/* Backward-filling progress stave — the visual time-compass */}
      <g>
        <line
          x1={MARGIN_X}
          y1={PROGRESS_Y}
          x2={VB_W - MARGIN_X}
          y2={PROGRESS_Y}
          stroke={COLORS.inkCreamSecondary}
          strokeWidth="0.5"
          opacity="0.35"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={filledX}
          y1={PROGRESS_Y}
          x2={VB_W - MARGIN_X}
          y2={PROGRESS_Y}
          stroke={COLORS.inkCream}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* tick marks for each act boundary */}
        {[ACT_DURATIONS[0], ACT_DURATIONS[0] + ACT_DURATIONS[1]].map((t, i) => {
          const f = t / TOTAL;
          const x = MARGIN_X + (VB_W - MARGIN_X * 2) * f;
          return (
            <line
              key={i}
              x1={x}
              y1={PROGRESS_Y - 3}
              x2={x}
              y2={PROGRESS_Y + 3}
              stroke={COLORS.inkCreamSecondary}
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>

      {/* Single act-progress dot under the active act */}
      {actIdx < ACTS.length && (
        <circle
          cx={MARGIN_X + (VB_W - MARGIN_X * 2) * actProgress}
          cy={320 + actIdx * 32 + 6}
          r="1.6"
          fill={COLORS.scoreAmber}
        />
      )}
    </Score>
  );
}
