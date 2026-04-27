import type { Side } from '@/types';
import { PAIRS } from '@/data/pairs';
import { computeAVD } from './scoring';

export interface ReflectionInput {
  pairChoices: (Side | undefined)[];
  pairLatencies: (number | undefined)[];
  /** Hover-then-cancel side per pair — Stillman 2018 conflict marker. */
  pairAlmosts?: (Side | undefined)[];
  emotionTiles: string[][];
  songs: [string, string, string];
  songYears: (number | null)[];
  tapBPM: number | null;
}

export interface ReflectionLine {
  /** Body text — italic serif. */
  text: string;
  /** Optional secondary annotation rendered smaller (mono). */
  annotation?: string;
  /** Index into the dot-leader pattern; matches the reading rhythm. */
  emphasis?: 'normal' | 'amber';
}

/** Identify the strongest AVD lean across pair commits. */
export function dominantLean(avd: { a: number; v: number; d: number }): {
  axis: 'arousal' | 'valence' | 'depth';
  pole: 'high' | 'low';
  delta: number;
} {
  const deltas = {
    arousal: avd.a - 0.5,
    valence: avd.v - 0.5,
    depth: avd.d - 0.5,
  } as const;
  const entries = (Object.entries(deltas) as ['arousal' | 'valence' | 'depth', number][])
    .map(([axis, d]) => ({
      axis,
      abs: Math.abs(d),
      pole: (d >= 0 ? 'high' : 'low') as 'high' | 'low',
      delta: d,
    }))
    .sort((a, b) => b.abs - a.abs);
  return { axis: entries[0].axis, pole: entries[0].pole, delta: entries[0].delta };
}

/** Phrase the dominant AVD lean as a single italic line. */
function phraseLean(lean: ReturnType<typeof dominantLean>): string {
  const { axis, pole, delta } = lean;
  // A neutral profile gets a non-judgmental phrasing rather than nothing.
  if (Math.abs(delta) < 0.08) return 'You held the middle. Steady on every axis.';
  if (axis === 'valence' && pole === 'high') return 'You reached for warmth more than shadow.';
  if (axis === 'valence' && pole === 'low') return 'You reached for shadow more than warmth.';
  if (axis === 'arousal' && pole === 'high') return 'You reached for intensity over stillness.';
  if (axis === 'arousal' && pole === 'low') return 'You reached for stillness over intensity.';
  if (axis === 'depth' && pole === 'high') return 'You reached for what runs underneath.';
  return 'You reached for what stays at the surface.';
}

/** Top emotion tiles across all GEMS excerpts. */
function topTiles(emotionTiles: string[][], n: number): string[] {
  const counts: Record<string, number> = {};
  emotionTiles.flat().forEach((t) => {
    counts[t] = (counts[t] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tile]) => tile);
}

/** Bucket a BPM into a tempo class label. */
export function tempoClass(bpm: number): { label: string; phrase: string } {
  if (bpm < 70) return { label: 'unhurried', phrase: 'unhurried' };
  if (bpm < 90) return { label: 'walking', phrase: 'a walking pulse' };
  if (bpm < 110) return { label: 'mid', phrase: 'a steady mid-tempo' };
  if (bpm < 130) return { label: 'driving', phrase: 'something that drives' };
  return { label: 'urgent', phrase: 'something with urgency' };
}

/**
 * Decide whether a year cluster falls in the reminiscence-bump period.
 * We don't know the user's age, so we use a permissive heuristic: any cluster
 * within an 8-year span is treated as "from one period of you." Krumhansl &
 * Zupnick 2013, replicated 2025 across 84 countries.
 */
function eraNarration(years: number[]): string | null {
  const valid = years.filter((y): y is number => Number.isFinite(y));
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min;
  const mid = Math.round((min + max) / 2);

  if (valid.length >= 2 && span <= 8) {
    return `Three songs from one period — around ${mid}. That tends to mean something.`;
  }
  if (valid.length >= 2 && span >= 25) {
    return `Your songs span ${span} years. You don't keep one self.`;
  }
  if (valid.length === 1) {
    return `One year landed — ${valid[0]}.`;
  }
  return `Your songs centre near ${mid}.`;
}

/**
 * Build the Reflection screen line-set from current store state.
 * Lines are delivered in order with ~1.4s between fade-ins; the last line
 * sets up the transition to Mirror.
 */
export function buildReflection(input: ReflectionInput): ReflectionLine[] {
  const lines: ReflectionLine[] = [];

  // Line 1 — the AVD lean from Phase 1
  const avd = computeAVD(input.pairChoices, input.pairLatencies);
  if (avd.weight > 0) {
    lines.push({ text: phraseLean(dominantLean(avd.vector)) });
  }

  // Line 2 — emotion vocabulary from Phase 2
  const tiles = topTiles(input.emotionTiles, 3);
  if (tiles.length > 0) {
    const list =
      tiles.length === 1 ? tiles[0]
      : tiles.length === 2 ? `${tiles[0]} and ${tiles[1]}`
      : `${tiles[0]}, ${tiles[1]}, and ${tiles[2]}`;
    lines.push({ text: `When the music played, you marked ${list}.` });
  }

  // Line 3 — songs (cite the FIRST one; Mirror will cite a different one)
  const firstSong = input.songs[0]?.trim();
  const firstYear = input.songYears[0];
  if (firstSong) {
    const yearTail = firstYear ? ` from ${firstYear}` : '';
    lines.push({
      text: `You carried ${firstSong}${yearTail}. I won't forget that.`,
    });
  }

  // Line 4 — era summary (only if we have multiple years)
  const era = eraNarration(input.songYears.filter((y): y is number => !!y));
  if (era && input.songYears.filter(Boolean).length >= 2) {
    lines.push({ text: era });
  }

  // Line 5 — tempo class from Phase 4
  if (input.tapBPM != null) {
    const tc = tempoClass(input.tapBPM);
    lines.push({
      text: `Your rhythm was ${tc.phrase}.`,
      annotation: `${input.tapBPM} BPM`,
    });
  }

  // Line 6 — hover-then-cancel conflict (only if the user's near-decisions
  // were frequent enough to warrant naming).
  const almostCount = (input.pairAlmosts ?? []).filter(Boolean).length;
  if (almostCount >= 2) {
    lines.push({
      text:
        almostCount >= 4
          ? 'You hovered between several. I kept the ones you settled on.'
          : `Twice you nearly chose the other side. I noticed.`,
    });
  }

  // Final line — the transition into Mirror
  lines.push({
    text: 'Now let me say what I see.',
    emphasis: 'amber',
  });

  return lines;
}

/** Single-axis label for the AVD lean — used in the Mirror attribution band. */
function attributionWord(axis: 'arousal' | 'valence' | 'depth', pole: 'high' | 'low'): string {
  if (axis === 'valence') return pole === 'high' ? 'warmth' : 'shadow';
  if (axis === 'arousal') return pole === 'high' ? 'intensity' : 'stillness';
  return pole === 'high' ? 'depth' : 'surface';
}

/**
 * Build the Mirror's causal-attribution band — Pandora "Why this song" +
 * Netflix "because you watched" idiom. Renders between the variation divider
 * and the Forer paragraphs as a bullet-separated string.
 */
export function buildAttribution(input: ReflectionInput): string | null {
  const fragments: string[] = [];

  const avd = computeAVD(input.pairChoices, input.pairLatencies);
  if (avd.weight > 0) {
    const lean = dominantLean(avd.vector);
    if (Math.abs(lean.delta) >= 0.08) {
      fragments.push(`because you chose ${attributionWord(lean.axis, lean.pole)}`);
    }
  }

  if (input.tapBPM != null) {
    const tc = tempoClass(input.tapBPM);
    fragments.push(`because you tapped ${tc.label}`);
  }

  const validYears = input.songYears.filter((y): y is number => !!y);
  if (validYears.length > 0) {
    const recent = validYears[validYears.length - 1];
    fragments.push(`because you carried ${recent}`);
  }

  if (fragments.length === 0) return null;
  return fragments.join('  ·  ');
}

/**
 * Mid-set operational transparency comment for Phase 1.
 * Per [memo §Phase 1](Research/ 5-minute-taste-extraction redesign.md): a
 * single Admirer line between pairs 3–6 — Buell & Norton 2011 visible labour.
 * We surface it on the 5th pair (`currentPair === 4`), based on the user's
 * directional lean across the first four commits.
 */
export function computeMidsetComment(
  pairChoices: (Side | undefined)[],
  pairLatencies: (number | undefined)[],
  currentPair: number
): string | null {
  // Only visible on the 5th pair (index 4) — surfaces once, then fades.
  if (currentPair !== 4) return null;

  const partialChoices = pairChoices.slice(0, 4);
  const partialLatencies = pairLatencies.slice(0, 4);
  const avd = computeAVD(partialChoices, partialLatencies);
  if (avd.weight === 0) return null;

  const lean = dominantLean(avd.vector);
  if (Math.abs(lean.delta) < 0.1) return null;

  if (lean.axis === 'valence' && lean.pole === 'high') return 'you are choosing the warmer ones — interesting';
  if (lean.axis === 'valence' && lean.pole === 'low') return 'you are leaning into the shadow side';
  if (lean.axis === 'arousal' && lean.pole === 'low') return 'you keep reaching for the slower ones';
  if (lean.axis === 'arousal' && lean.pole === 'high') return 'you are picking the urgent ones';
  if (lean.axis === 'depth' && lean.pole === 'high') return 'you reach for what runs underneath';
  return 'you stay with what is clear';
}

/**
 * Pick the song to cite at Mirror — the Replika memory-callback move.
 * Reflection cites songs[0] (formative period); Mirror picks one the
 * Reflection didn't, working down the Rathbone identity ladder so the two
 * beats hit different identity registers.
 */
export function pickMirrorSong(songs: [string, string, string], songYears: (number | null)[]): {
  song: string;
  year: number | null;
} | null {
  // Prefer songs[2] (taste autonomy), then songs[1] (relational binding).
  // Skip songs[0] — already cited by Reflection.
  for (const i of [2, 1]) {
    const s = songs[i]?.trim();
    if (s) return { song: s, year: songYears[i] ?? null };
  }
  return null;
}
