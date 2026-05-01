import type { AVD, ScoredArchetype, ScoredVariation, Side, Variation } from '@/types';
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
  // log() requires strictly positive latencies. Synthetic / dev fixtures may
  // hand us 0 or negative values; filter to positive only so the z-score
  // calculation never sees -Infinity. NaN-poisoning here cascaded silently
  // into a default-1.0 weight before, which only worked by accident.
  const rts = pairLatencies
    .filter((x): x is number => Number.isFinite(x) && (x as number) > 0)
    .map((x) => Math.log(x));
  const mean = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
  const sd = rts.length
    ? Math.sqrt(rts.reduce((s, x) => s + (x - mean) ** 2, 0) / rts.length)
    : 1;

  const confWeight = (latency?: number): number => {
    if (!latency || !Number.isFinite(latency) || latency <= 0) return 1;
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
  const allTiles = emotionTiles.flat();
  const emoCount = allTiles.length || 1;

  const scored = ARCHETYPES.map<ScoredArchetype>((arc) => {
    const distance = avdDistance(vector, arc.avd);
    const avdSim = 1 - Math.min(distance / MAX_DISTANCE, 1);

    const emoHits = allTiles.filter((t) => arc.emotions.includes(t)).length;
    const emoFrac = emoHits / emoCount;

    // Lean on emotion-tile signal until pair commits exist (per memo §1A).
    const avdWeight = weight === 0 ? 0 : 0.7;
    const total = avdWeight * avdSim + (1 - avdWeight) * emoFrac;

    return { ...arc, score: total, distance, emoFrac };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export interface VariationContext {
  /** Phase 3 song release years, if resolved. Used for era matching. */
  songYears: number[];
  /** Phase 4 tap BPM, if resolved. Maps to within-archetype intensity. */
  tapBPM: number | null;
  /** Flat list of all emotion tiles selected across Phase 2 excerpts. */
  emotionTiles: string[];
  /** AVD vector recovered from Phase 1 pair commits. */
  avd: AVD;
  /** Optional ε for stochasticity. Memo §1F: 0.10–0.15. */
  epsilon?: number;
}

/** Bucket a numeric year into the era enum used by Variation.era. */
export function yearToEra(year: number): Variation['era'] | null {
  if (year < 1970) return null;
  if (year < 1980) return '1970s';
  if (year < 1990) return '1980s';
  if (year < 2000) return '1990s';
  if (year < 2010) return '2000s';
  if (year < 2020) return '2010s';
  return '2020s';
}

/**
 * Within-archetype variation pick (Burke 2002 cascade hybrid step 2).
 * Combines Phase 1 AVD refinement, Phase 2 secondary-emotion overlap,
 * Phase 3 era signal, and Phase 4 tempo. ε-greedy injection at this
 * level only — wrong archetypes break the contract, wrong variations
 * produce surprise-hit effects (Anderson et al. 2020; Zhang et al. 2012).
 */
export function pickVariation(
  archetype: ScoredArchetype,
  ctx: VariationContext
): ScoredVariation {
  const epsilon = ctx.epsilon ?? 0.12;

  // Era preference vector from Phase 3 named songs.
  const eraVotes: Partial<Record<Variation['era'], number>> = {};
  ctx.songYears.forEach((y) => {
    const era = yearToEra(y);
    if (era) eraVotes[era] = (eraVotes[era] ?? 0) + 1;
  });
  const eraVoteTotal = Object.values(eraVotes).reduce<number>((s, n) => s + (n ?? 0), 0);

  // Map BPM into a target intensity (arousal) refinement, only when present.
  const bpmTargetA =
    ctx.tapBPM == null ? null : Math.max(0, Math.min(1, (ctx.tapBPM - 50) / 120));

  const ranked = archetype.variations.map<ScoredVariation>((v) => {
    // 1. AVD refinement: distance from Phase 1 vector to variation centre.
    const avdDist = avdDistance(ctx.avd, v.avd);
    const avdSim = 1 - Math.min(avdDist / MAX_DISTANCE, 1);

    // 2. Era match: fraction of named songs that vote this era.
    const eraSim = eraVoteTotal > 0 ? (eraVotes[v.era] ?? 0) / eraVoteTotal : 0.5;

    // 3. Emotion overlap on variation tags (refines archetype-level emotion).
    const emoHits = ctx.emotionTiles.filter((t) => v.emotions.includes(t)).length;
    const emoSim = ctx.emotionTiles.length > 0 ? emoHits / ctx.emotionTiles.length : 0;

    // 4. Tempo match: closeness of variation arousal to BPM-derived target.
    const tempoSim = bpmTargetA == null ? 0.5 : 1 - Math.abs(bpmTargetA - v.avd[0]);

    // Weighted blend — AVD dominates, era is the crucial Phase 3 signal,
    // emotion + tempo are tie-breakers.
    const base =
      0.40 * avdSim +
      0.25 * eraSim +
      0.20 * emoSim +
      0.15 * tempoSim;

    // ε-greedy: per-variation uniform noise, scaled so argmax can flip
    // without becoming unrecognisable as a recommendation.
    const noise = (Math.random() * 2 - 1) * epsilon;
    const distance = avdDist;
    return { ...v, distance, score: base + noise };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0];
}

/**
 * One-shot resolver: from raw store fields, return the top archetype + the
 * picked variation in one call. Used by Wait / Reveal / Listening so the
 * archetype × variation contract stays consistent across the post-rite arc.
 * Pass `epsilon: 0` for deterministic resolution after Mirror has rendered.
 */
export function resolveSelection(args: {
  pairChoices: (Side | undefined)[];
  pairLatencies: (number | undefined)[];
  emotionTiles: string[][];
  songYears: (number | null)[];
  tapBPM: number | null;
  epsilon?: number;
}): { archetype: ScoredArchetype; variation: ScoredVariation } | null {
  const top = scoreArchetypes(args.pairChoices, args.pairLatencies, args.emotionTiles)[0];
  if (!top) return null;
  const variation = pickVariation(top, {
    avd: computeAVD(args.pairChoices, args.pairLatencies).vector,
    songYears: args.songYears.filter((y): y is number => !!y),
    tapBPM: args.tapBPM,
    emotionTiles: args.emotionTiles.flat(),
    epsilon: args.epsilon ?? 0,
  });
  return { archetype: top, variation };
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

/**
 * Phase 5 latency-conditional Forer line (memo §passive sensing).
 * Median pair-commit RT > 3.5s reads as deliberation; < 1.5s reads as
 * decisiveness. Real passive signal converted into Forer-compatible output.
 */
export function getLatencyLine(pairLatencies: (number | undefined)[]): string | null {
  const rts = pairLatencies.filter((x): x is number => !!x);
  if (rts.length < 3) return null;
  const sorted = [...rts].sort((a, b) => a - b);
  // Even-length arrays: average the two middle samples so the median doesn't
  // bias toward the upper sample. Matters at the boundary between
  // "deliberation" (>3.5s) and "decisive" (<1.5s) phrasing.
  const mid = sorted.length / 2;
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[Math.floor(mid)];
  if (median > 3500) return 'You took your time. That is what I needed from you.';
  if (median < 1500) return 'You knew what you wanted. That helped.';
  return null;
}
