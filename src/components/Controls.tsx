'use client';

import { useStore } from '@/lib/store';
import { POST_RITE_PHASE } from './TopBar';

const MAX_PHASE = 9;

export function Controls() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const reset = useStore((s) => s.reset);

  // After Mirror the rite is unidirectional. Surface only `exit`.
  const inRite = phase >= POST_RITE_PHASE;

  if (inRite) {
    return (
      <div className="controls">
        <button type="button" className="ctrl-btn" onClick={reset} aria-label="Exit the rite">
          exit
        </button>
      </div>
    );
  }

  return (
    <div className="controls">
      <button
        type="button"
        className="ctrl-btn"
        disabled={phase === 0}
        onClick={() => setPhase(Math.max(0, phase - 1))}
      >
        previous
      </button>
      <button type="button" className="ctrl-btn" onClick={reset}>
        reset
      </button>
      <button
        type="button"
        className="ctrl-btn primary"
        disabled={phase >= MAX_PHASE}
        onClick={() => setPhase(Math.min(MAX_PHASE, phase + 1))}
      >
        next
      </button>
    </div>
  );
}
