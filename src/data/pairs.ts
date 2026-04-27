import type { Pair } from '@/types';

/**
 * 9 forced-choice pairs along the production-aesthetic axes the redesign
 * memo §Phase 1 prescribes (warmth, density, voice, production, mode,
 * tempo, rhythm, register, space). Each pair varies primarily on its
 * declared axis; the AVD `coord` is set so commits still aggregate into
 * a sensible position in AVD space for archetype scoring.
 *
 * Memo §1A: word-pair Spectrum was psychometrically broken on A/D —
 * audio replaces these in Phase 4 of the engineering plan; until then
 * the words sit alongside [PairWaveform](src/score/PairWaveform.tsx)
 * shape glyphs for visual contrast.
 */
export const PAIRS: Pair[] = [
  {
    axis: 'warmth',
    a: { label: 'WARM',         desc: 'a room you stayed in',           shape: 'low',     coord: { a: 0.30, v: 0.78, d: 0.55 } },
    b: { label: 'COLD',         desc: 'glass at dawn',                  shape: 'crystal', coord: { a: 0.30, v: 0.40, d: 0.65 } },
  },
  {
    axis: 'density',
    a: { label: 'DENSE',        desc: 'many things at once',            shape: 'thick',   coord: { a: 0.55, v: 0.55, d: 0.65 } },
    b: { label: 'SPARE',        desc: 'a few things, held',             shape: 'thin',    coord: { a: 0.30, v: 0.55, d: 0.40 } },
  },
  {
    axis: 'voice',
    a: { label: 'SUNG',         desc: 'a voice that wants to be heard', shape: 'mid',     coord: { a: 0.50, v: 0.65, d: 0.50 } },
    b: { label: 'WORDLESS',     desc: 'only the room speaks',           shape: 'flat',    coord: { a: 0.40, v: 0.55, d: 0.65 } },
  },
  {
    axis: 'production',
    a: { label: 'ANALOG',       desc: 'tape hiss, hands on instruments', shape: 'organic', coord: { a: 0.40, v: 0.65, d: 0.60 } },
    b: { label: 'DIGITAL',      desc: 'made of light',                   shape: 'crystal', coord: { a: 0.55, v: 0.55, d: 0.50 } },
  },
  {
    axis: 'mode',
    a: { label: 'MAJOR',        desc: 'light walking through',           shape: 'rising',  coord: { a: 0.50, v: 0.82, d: 0.40 } },
    b: { label: 'MINOR',        desc: 'a door left open in winter',      shape: 'falling', coord: { a: 0.40, v: 0.22, d: 0.70 } },
  },
  {
    axis: 'tempo',
    a: { label: 'SLOW',         desc: 'time you can sit inside',         shape: 'sparse',  coord: { a: 0.20, v: 0.55, d: 0.55 } },
    b: { label: 'MID',          desc: 'a pulse you can rest against',    shape: 'steady',  coord: { a: 0.55, v: 0.55, d: 0.50 } },
  },
  {
    axis: 'rhythm',
    a: { label: 'DRIVING',      desc: 'wants somewhere',                 shape: 'urgent',  coord: { a: 0.78, v: 0.55, d: 0.45 } },
    b: { label: 'FLOATING',     desc: 'already arrived',                 shape: 'drift',   coord: { a: 0.25, v: 0.55, d: 0.62 } },
  },
  {
    axis: 'register',
    a: { label: 'LOW',          desc: 'felt in the chest',               shape: 'deep',    coord: { a: 0.45, v: 0.50, d: 0.68 } },
    b: { label: 'HIGH',         desc: 'felt at the temples',             shape: 'bright',  coord: { a: 0.55, v: 0.58, d: 0.42 } },
  },
  {
    axis: 'space',
    a: { label: 'REVERBERANT',  desc: 'the room becomes the instrument', shape: 'wet',     coord: { a: 0.40, v: 0.55, d: 0.78 } },
    b: { label: 'DRY',          desc: 'spoken into your ear',            shape: 'tight',   coord: { a: 0.50, v: 0.55, d: 0.40 } },
  },
];
