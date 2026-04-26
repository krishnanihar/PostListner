'use client';

/**
 * Placeholder for the Listening / Conducting / Dissolution / Return arc
 * (chapters 4–6 in the audit). Intended scope:
 *
 *   • DeviceMotion-driven 4-stem orchestra with HRTF panning
 *   • Real-time inscription of the score via gesture
 *   • Choreographed dissolution (onset drift + Bregman streaming break)
 *   • Inverse return with melodic-seed reprise
 *
 * For now: a single empty page in the score that holds the place. The four
 * staves below are seeded but inert — they'll become the four stems.
 */

import { useEffect, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Downbeat } from '@/score/marks';
import { COLORS } from '@/score/tokens';
import { useStore } from '@/lib/store';

const STEM_NAMES = ['vocals', 'drums', 'bass', 'other'];
const STEM_Y = [200, 290, 380, 470];

export function Listening() {
  const setPhase = useStore((s) => s.setPhase);
  const [taps, setTaps] = useState<{ stem: number; x: number }[]>([]);

  useEffect(() => {
    // Auto-advance after 12s in prototype mode so the arc is walkable.
    const id = window.setTimeout(() => setPhase(9), 12_000);
    return () => clearTimeout(id);
  }, [setPhase]);

  const onTap = (e: React.PointerEvent<SVGRectElement>, stem: number) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (VB_W - MARGIN_X * 2);
    setTaps((prev) => [...prev, { stem, x: MARGIN_X + x }]);
  };

  return (
    <Score
      variant="cream"
      pageTitle="ix. orchestra"
      pageNumber="—"
      voiceCue="hold the phone like a baton"
      footer="conducting · 4 stems · gesture · hrtf — placeholder"
      staves={STEM_Y.map((y) => ({ y }))}
    >
      {/* Stem labels in the left margin */}
      {STEM_NAMES.map((name, i) => (
        <text
          key={name}
          x={MARGIN_X - 6}
          y={STEM_Y[i] + 8}
          fill={COLORS.inkCreamSecondary}
          fontSize="9"
          fontFamily="var(--font-mono)"
          textAnchor="end"
          letterSpacing="0.18em"
        >
          {name}
        </text>
      ))}

      {/* Tap surfaces (one per stem) — accumulate Downbeats wherever struck */}
      {STEM_Y.map((y, i) => (
        <rect
          key={i}
          x={MARGIN_X}
          y={y - 14}
          width={VB_W - MARGIN_X * 2}
          height={28}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => onTap(e, i)}
        />
      ))}

      {taps.map((t, i) => (
        <g key={i} transform={`translate(${t.x}, ${STEM_Y[t.stem] + 6})`}>
          <Downbeat size={4} color={COLORS.inkCream} opacity={0.8} />
        </g>
      ))}
    </Score>
  );
}
