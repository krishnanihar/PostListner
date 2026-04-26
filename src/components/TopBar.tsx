'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
const PHASE_NAMES = [
  'threshold',
  'spectrum',
  'emotion',
  'carry',
  'moment',
  'mirror',
  'composing',
  'recognition',
  'orchestra',
  'silence',
];

const TARGET_SECONDS = 300;
/** Phase index from which onward the rite is unidirectional & timer-less. */
export const POST_RITE_PHASE = 6;

export function TopBar() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const startTime = useStore((s) => s.startTime);
  const ensureStartTime = useStore((s) => s.ensureStartTime);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    ensureStartTime();
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ensureStartTime]);

  const elapsed = startTime && now ? Math.floor((now - startTime) / 1000) : 0;
  const cur = Math.min(elapsed, TARGET_SECONDS);
  const m = String(Math.floor(cur / 60)).padStart(2, '0');
  const s = String(cur % 60).padStart(2, '0');

  const inRite = phase >= POST_RITE_PHASE;

  return (
    <div className="topbar">
      <div className="brand">
        <strong>post listener</strong> &nbsp;·&nbsp; <em>the score</em>
      </div>
      <div className="timeline">
        {ROMAN.map((r, i) => {
          const isActive = i === phase;
          const isDone = i < phase;
          // After Mirror, timeline is read-only
          const clickable = !inRite || i <= phase;
          return (
            <button
              key={i}
              type="button"
              className={
                'tl-step' +
                (isDone ? ' done' : '') +
                (isActive ? ' active' : '')
              }
              onClick={() => clickable && setPhase(i)}
              aria-label={`Page ${r}: ${PHASE_NAMES[i]}`}
              title={PHASE_NAMES[i]}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              {r}
            </button>
          );
        })}
      </div>
      <div className="timer" style={{ opacity: inRite ? 0 : 1, transition: 'opacity 0.5s' }}>
        {m}:{s} / 05:00
      </div>
    </div>
  );
}
