import type { AVD, ScoredArchetype, Side } from '@/types';
import { ARCHETYPES } from '@/data/archetypes';
import { PAIRS } from '@/data/pairs';

const NEUTRAL: AVD = { a: 0.5, v: 0.5, d: 0.5 };

export interface AVDResult {
  vector: AVD;
  /** Effective number of pair commits (sum of confidence weights) */
  weight: number;
}

/**
 * Compute the participant's AVD vector from their pair commits.
 * Each commit pulls the running vector toward the chosen option's coord,
 * weighted by confidence (log-RT z-score per Stillman 2020 — long dwell ≠
 * stronger preference). Falls back to neutral when no commits exist.
 */
export function computeAVD(
  pairChoices: (Side | undefined)[],
  pairLatencies: (number | undefined)[]
): AVDResult {
  const rts = pairLatencies.filter((x): x is number => !!x).map((x) => Math.log(x));
  const mean = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
  const sd = rts.length
    ? Math.sqrt(rts.reduce((s, x) => s + (x - mean) ** 2, 0) / rts.length)
    : 1;

  const confWeight = (latency?: number): number => {
    if (!latency) return 1;
    const z = (Math.log(latency) - mean) / (sd || 1);
    if (z > 1.5) return 0.4;
    if (z > 0.5) return 0.7;
    if (z < -0.5) return 1.1;
    return 1.0;
  };

  let sumA = 0, sumV = 0, sumD = 0, totalW = 0;
  pairChoices.forEach((side, i) => {
    if (!side) return;
    const pair = PAIRS[i];
    if (!pair) return;
    const coord = side === 'a' ? pair.a.coord : pair.b.coord;
    const w = confWeight(pairLatencies[i]);
    sumA += coord.a * w;
    sumV += coord.v * w;
    sumD += coord.d * w;
    totalW += w;
  });

  if (totalW === 0) return { vector: { ...NEUTRAL }, weight: 0 };
  return {
    vector: { a: sumA / totalW, v: sumV / totalW, d: sumD / totalW },
    weight: totalW,
  };
}

function avdDistance(x: AVD, target: [number, number, number]): number {
  const da = x.a - target[0];
  const dv = x.v - target[1];
  const dd = x.d - target[2];
  return Math.sqrt(da * da + dv * dv + dd * dd);
}

const MAX_DISTANCE = Math.sqrt(3); // worst case in unit cube

export function scoreArchetypes(
  pairChoices: (Side | undefined)[],
  pairLatencies: (number | undefined)[],
  emotionTiles: string[][]
): ScoredArchetype[] {
  const { vector, weight } = computeAVD(pairChoices, pairLatencies);
  // emotion intersection
  const allTiles = emotionTiles.flat();
  const emoCount = allTiles.length || 1;

  const scored = ARCHETYPES.map<ScoredArchetype>((arc) => {
    const distance = avdDistance(vector, arc.avd);
    // Convert to similarity 0..1 (higher = closer)
    const avdSim = 1 - Math.min(distance / MAX_DISTANCE, 1);

    const emoHits = allTiles.filter((t) => arc.emotions.includes(t)).length;
    const emoFrac = emoHits / emoCount;

    // Weight AVD only when we have meaningful commits, otherwise lean on emotion
    const avdWeight = weight === 0 ? 0 : 0.7;
    const total = avdWeight * avdSim + (1 - avdWeight) * emoFrac;

    return { ...arc, score: total, distance, emoFrac };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function getTimeOfDayLine(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 23 || hour < 5)  return 'You came to me at the loneliest hour. That always means something.';
  if (hour >= 5 && hour < 8)   return 'You got here early. The morning ones know what they want.';
  if (hour >= 8 && hour < 12)  return 'Morning is honest with you. I noticed.';
  if (hour >= 12 && hour < 14) return 'The middle of the day is hard for music. You came anyway.';
  if (hour >= 14 && hour < 18) return "Afternoon — the patient hour. You're not in a hurry.";
  if (hour >= 18 && hour < 21) return 'You found the gap between things. Good.';
  return "It's late, but not too late. The good listening hour.";
}
