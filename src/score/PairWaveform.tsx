import type { WaveShape } from '@/types';

/**
 * Visual waveform strip — one per pair side. Each shape token maps to a
 * deterministic 36-bar height profile (ported from postlistener_profiling_v2).
 * Without audio yet, this is the strongest non-verbal cue for the sonic
 * contrast each pair encodes (memo §1A: word-pairs alone are broken).
 */
function wfHeight(shape: WaveShape, i: number, n: number): number {
  const t = i / n;
  switch (shape) {
    case 'low':     return 20 + 50 * Math.sin(t * Math.PI * 2) * Math.exp(-t * 0.6);
    case 'high':    return 35 + 35 * Math.sin(t * Math.PI * 8);
    case 'thick':   return 55 + 35 * Math.sin(t * Math.PI * 12) * Math.cos(t * Math.PI * 3);
    case 'thin':    return 15 + 25 * Math.sin(t * Math.PI * 4);
    case 'mid':     return 30 + 40 * Math.sin(t * Math.PI * 5);
    case 'flat':    return 25 + 8 * Math.sin(t * Math.PI * 15);
    case 'organic': return 25 + 35 * Math.sin(t * Math.PI * 3) + 12 * Math.sin(t * Math.PI * 9);
    case 'crystal': return 45 + 30 * Math.abs(Math.sin(t * Math.PI * 6));
    case 'rising':  return 15 + 70 * t + 10 * Math.sin(t * Math.PI * 8);
    case 'falling': return 75 - 60 * t + 10 * Math.sin(t * Math.PI * 8);
    case 'sparse':  return 20 + 30 * (i % 6 === 0 ? 1 : 0.3);
    case 'steady':  return 40 + 20 * Math.sin(t * Math.PI * 8);
    case 'urgent':  return 50 + 35 * Math.abs(Math.sin(t * Math.PI * 16));
    case 'drift':   return 35 + 15 * Math.sin(t * Math.PI * 1.5);
    case 'deep':    return 60 + 25 * Math.sin(t * Math.PI * 2.5);
    case 'bright':  return 25 + 35 * Math.sin(t * Math.PI * 14);
    case 'wet':     return 35 + 35 * Math.sin(t * Math.PI * 4) * Math.exp(-t * 0.4);
    case 'tight':   return 50 + 15 * Math.sin(t * Math.PI * 20);
    default:        return 30 + 30 * Math.sin(t * Math.PI * 4);
  }
}

interface PairWaveformProps {
  shape: WaveShape;
  /** Current visual state — drives bar color. */
  state: 'idle' | 'hover' | 'committed' | 'dim';
  /** Anchor side — controls which end the bars compress toward when dim. */
  align?: 'left' | 'right';
  bars?: number;
  height?: number;
}

export function PairWaveform({
  shape,
  state,
  align = 'left',
  bars = 32,
  height = 44,
}: PairWaveformProps) {
  const color =
    state === 'committed' ? 'var(--score-amber)'
    : state === 'hover' ? 'var(--ink)'
    : 'var(--ink-secondary)';

  const opacity = state === 'dim' ? 0.35 : state === 'idle' ? 0.55 : 0.95;

  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: align === 'left' ? 'flex-start' : 'flex-end',
        gap: 1.5,
        opacity,
        transition: 'opacity 0.3s',
      }}
      aria-hidden
    >
      {Array.from({ length: bars }, (_, i) => {
        const h = Math.max(4, Math.min(95, wfHeight(shape, i, bars)));
        return (
          <div
            key={i}
            style={{
              flex: 1,
              maxWidth: 4,
              height: `${h}%`,
              background: color,
              transition: 'background 0.3s, height 0.4s, opacity 0.3s',
            }}
          />
        );
      })}
    </div>
  );
}
