export type Side = 'a' | 'b';

export type WaveShape =
  | 'low' | 'high' | 'thick' | 'thin' | 'mid' | 'flat'
  | 'organic' | 'crystal' | 'rising' | 'falling' | 'sparse'
  | 'steady' | 'urgent' | 'drift' | 'deep' | 'bright'
  | 'wet' | 'tight';

/** Primary AVD axis a pair targets. Used for Spectrum balance + UI labelling. */
export type PairAxis = 'arousal' | 'valence' | 'depth';

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

export interface Archetype {
  id: string;
  name: string;
  variation: string;
  /** Target AVD vector this archetype occupies. */
  avd: [number, number, number];
  emotions: string[];
  forer: string[];
}

export interface ScoredArchetype extends Archetype {
  score: number;
  distance: number;
  emoFrac: number;
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
