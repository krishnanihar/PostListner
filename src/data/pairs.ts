import type { Pair } from '@/types';

/**
 * 9 pairs balanced 3/3/3 across Arousal · Valence · Depth.
 * Each pair varies primarily on its declared axis; secondary axes held
 * roughly constant so the AVD signal isn't blurred by side-channel drift.
 *
 * Coords are 0–1 in (a)rousal, (v)alence, (d)epth. Scoring is distance-based:
 * each commit accumulates toward the chosen option's coord, weighted by
 * confidence (log-RT z-score).
 */
export const PAIRS: Pair[] = [
  // — Valence ——
  {
    axis: 'valence',
    a: { label: 'SHADOW',  desc: 'A door left open in winter',         shape: 'falling', coord: { a: 0.30, v: 0.15, d: 0.55 } },
    b: { label: 'WARMTH',  desc: 'A room you stayed in',               shape: 'low',     coord: { a: 0.30, v: 0.85, d: 0.55 } },
  },
  {
    axis: 'valence',
    a: { label: 'ACHE',    desc: 'A song that knows what it lost',     shape: 'wet',     coord: { a: 0.25, v: 0.10, d: 0.70 } },
    b: { label: 'BLOOM',   desc: 'A song that arrives somewhere',      shape: 'rising',  coord: { a: 0.40, v: 0.90, d: 0.55 } },
  },
  {
    axis: 'valence',
    a: { label: 'FOG',     desc: 'A weather you walk inside',          shape: 'flat',    coord: { a: 0.15, v: 0.25, d: 0.55 } },
    b: { label: 'GLASS',   desc: 'A clarity that asks nothing',        shape: 'crystal', coord: { a: 0.20, v: 0.75, d: 0.50 } },
  },

  // — Arousal ——
  {
    axis: 'arousal',
    a: { label: 'PULSE',   desc: 'A heart that is already at rest',    shape: 'sparse',  coord: { a: 0.20, v: 0.55, d: 0.40 } },
    b: { label: 'SHIMMER', desc: 'A heart still climbing',             shape: 'bright',  coord: { a: 0.65, v: 0.60, d: 0.40 } },
  },
  {
    axis: 'arousal',
    a: { label: 'DRIFT',   desc: 'No-where. Already arrived.',         shape: 'drift',   coord: { a: 0.20, v: 0.50, d: 0.40 } },
    b: { label: 'DRIVE',   desc: 'Wants somewhere. Now.',              shape: 'urgent',  coord: { a: 0.75, v: 0.55, d: 0.40 } },
  },
  {
    axis: 'arousal',
    a: { label: 'EMBER',   desc: 'Slow, kept warm',                    shape: 'low',     coord: { a: 0.30, v: 0.55, d: 0.45 } },
    b: { label: 'SPARK',   desc: 'Sudden, struck',                     shape: 'high',    coord: { a: 0.80, v: 0.55, d: 0.40 } },
  },

  // — Depth ——
  {
    axis: 'depth',
    a: { label: 'AIR',     desc: 'Held lightly. No weight to land.',   shape: 'thin',    coord: { a: 0.30, v: 0.55, d: 0.20 } },
    b: { label: 'WEIGHT',  desc: 'Felt in the chest, the floor',       shape: 'deep',    coord: { a: 0.30, v: 0.50, d: 0.80 } },
  },
  {
    axis: 'depth',
    a: { label: 'SURFACE', desc: 'It says what it says',               shape: 'tight',   coord: { a: 0.30, v: 0.55, d: 0.20 } },
    b: { label: 'UNDERTOW',desc: 'It says one thing and means another', shape: 'wet',    coord: { a: 0.30, v: 0.45, d: 0.85 } },
  },
  {
    axis: 'depth',
    a: { label: 'CLOSE',   desc: 'Spoken into your ear',               shape: 'tight',   coord: { a: 0.30, v: 0.55, d: 0.25 } },
    b: { label: 'VAST',    desc: 'Spoken across a hall',               shape: 'wet',     coord: { a: 0.30, v: 0.55, d: 0.85 } },
  },
];
