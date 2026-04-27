export type Side = 'a' | 'b';

export type WaveShape =
  | 'low' | 'high' | 'thick' | 'thin' | 'mid' | 'flat'
  | 'organic' | 'crystal' | 'rising' | 'falling' | 'sparse'
  | 'steady' | 'urgent' | 'drift' | 'deep' | 'bright'
  | 'wet' | 'tight';

/**
 * Production-aesthetic axis a pair targets. Aligned with the redesign
 * memo §Phase 1 — the 9 sonic-contrast axes that the audio version of
 * Spectrum probes. Used for Spectrum balance + UI labelling.
 */
export type PairAxis =
  | 'warmth'
  | 'density'
  | 'voice'
  | 'production'
  | 'mode'
  | 'tempo'
  | 'rhythm'
  | 'register'
  | 'space';

export interface AVD {
  a: number; // 0–1
  v: number; // 0–1
  d: number; // 0–1
}

export interface PairOption {
  label: string;
  desc: string;
  shape: WaveShape;
  coord: AVD;
}

export interface Pair {
  axis: PairAxis;
  a: PairOption;
  b: PairOption;
}

export interface Excerpt {
  name: string;
  prompt: string;
  tiles: string[];
}

export interface SongPrompt {
  line: string;
  meta: string;
}

export interface Variation {
  id: string;
  /** Short tag, e.g. "2010s · Lo-fi piano" */
  tag: string;
  /** Era bucket used for matching against Phase 3 song-year signal. */
  era: '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s';
  /** Variation-level AVD target — refines the archetype centre. */
  avd: [number, number, number];
  /** Production-aesthetic vector: brightness, density, warmth in 0..1. */
  production: { brightness: number; density: number; warmth: number };
  /** Secondary emotion tags carried by this variation. */
  emotions: string[];
}

export interface Archetype {
  id: string;
  name: string;
  /** Centre of mass in AVD space — used at the archetype-selection step. */
  avd: [number, number, number];
  /** GEMS-9 / Cowen-13 tags this archetype responds to. */
  emotions: string[];
  /** Five-line Forer-balanced reflection (Furnham & Schofield 1987). */
  forer: string[];
  /** Four within-archetype variations — the 6×4 grid leaf. */
  variations: Variation[];
}

export interface ScoredArchetype extends Archetype {
  score: number;
  distance: number;
  emoFrac: number;
}

export interface ScoredVariation extends Variation {
  /** Distance from user signal to this variation, lower = closer. */
  distance: number;
  /** Final score after ε-greedy perturbation. */
  score: number;
}

export interface NoteSection {
  h: string;
  p: string;
}

export interface PhaseNote {
  phase: number;
  eyebrow: string;
  title: string;
  sections: NoteSection[];
  refs: string[];
}
