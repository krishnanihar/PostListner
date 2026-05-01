import type { WaveShape } from '@/types';

export function wfHeight(shape: WaveShape, i: number, n: number): number {
  // Callers pass `n` as a sample count. Empty waveforms (n <= 0) would
  // produce NaN via division — return a neutral baseline instead.
  if (n <= 0) return 30;
  const t = i / n;
  switch (shape) {
    case 'low':     return 20 + 50 * Math.sin(t * Math.PI * 2) * Math.exp(-t * 0.6);
    case 'high':    return 35 + 35 * Math.sin(t * Math.PI * 8);
    case 'thick':   return 55 + 35 * Math.sin(t * Math.PI * 12) * Math.cos(t * Math.PI * 3);
    case 'thin':    return 15 + 25 * Math.sin(t * Math.PI * 4);
    case 'mid':     return 30 + 40 * Math.sin(t * Math.PI * 5);
    case 'flat':    return 25 + 8  * Math.sin(t * Math.PI * 15);
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
