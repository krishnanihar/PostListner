/**
 * Builds a 6-minute ElevenLabs `composition_plan` aligned to the Listening
 * engine's six dissolution sections. Mirrors the prompt-sanitization style of
 * `auditionPrompt()` in `audioPrompts.ts`: drops archetype names (moderator
 * flagged) and keeps timbre / production / era / emotion descriptors.
 */
import type { Archetype, Variation } from '@/types';
import { ARCHETYPES } from '@/data/archetypes';

export interface CompositionSection {
  section_name: string;
  positive_local_styles: string[];
  negative_local_styles: string[];
  duration_ms: number;
}

export interface CompositionPlan {
  positive_global_styles: string[];
  negative_global_styles: string[];
  sections: CompositionSection[];
}

/** Six sections summing to 360_000 ms (6 minutes). Names match ListeningEngine SECTIONS. */
const SECTION_DURATIONS_MS = [
  60_000,  // threshold
  90_000,  // release
  60_000,  // peak
  60_000,  // return
  60_000,  // homecoming
  30_000,  // silence
];

const SECTION_NAMES = ['threshold', 'release', 'peak', 'return', 'homecoming', 'silence'];

/** Per-section style bias — how the dissolution arc shapes the music itself, before
 *  any post-processing. The Listening engine will further degrade these via Bregman
 *  cue removal at runtime; the composition plan just gives it material to degrade. */
const SECTION_STYLE_BIAS: Record<string, { positive: string[]; negative: string[] }> = {
  threshold:   { positive: ['centered', 'patient', 'restrained dynamics'], negative: ['busy percussion'] },
  release:     { positive: ['widening', 'softening', 'expanding reverb'],  negative: ['tight', 'dry'] },
  peak:        { positive: ['suspended', 'enveloping', 'shimmering'],      negative: ['rhythmic drive'] },
  return:      { positive: ['gentle reorientation', 'warm low end'],       negative: ['harsh', 'bright'] },
  homecoming:  { positive: ['plagal warmth', 'amen cadence', 'simple'],    negative: ['tension', 'unresolved'] },
  silence:     { positive: ['fading', 'sustained tone', 'distant'],        negative: ['active', 'percussive'] },
};

/** Escape a string so it can be safely interpolated into a RegExp literal. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ElevenLabs music moderator flags some terms — most often the literary
 * archetype names ("Velvet Mystic", "Sky-Seeker", "Quiet Insurgent"). Build
 * the blocklist from ARCHETYPES.name so renames don't leave dead patterns
 * behind. We strip a leading "The " (moderator hits the noun phrase, not the
 * article), then build a regex that tolerates space ↔ hyphen variants.
 */
const BANNED_PATTERNS: RegExp[] = ARCHETYPES.map((a) => {
  const core = a.name.replace(/^The\s+/i, '');
  // Tokenize on whitespace and rejoin with `[\s-]+` so "Velvet Mystic",
  // "Velvet-Mystic", and "Velvet  Mystic" all match.
  const tokens = core.split(/\s+/).map(escapeRegExp);
  return new RegExp(`\\b${tokens.join('[\\s-]+')}\\b`, 'i');
});

function sanitize(s: string): string {
  let out = s;
  for (const re of BANNED_PATTERNS) out = out.replace(re, '').trim();
  return out;
}

export function buildCompositionPlan(opts: {
  archetype: Archetype;
  variation: Variation;
  avd?: [number, number, number];
}): CompositionPlan {
  const { archetype, variation, avd } = opts;

  // Variation tag fragments — split the Daylist-style "2010s · lo-fi piano …" tag
  // on its separators, keep the era + production cues, drop empty tokens.
  const variationDescriptors = sanitize(variation.tag)
    .split(/[·\-,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Archetype-derived descriptors. There is no `musicalDescriptors` field on the
  // type; we derive equivalent cues from `archetype.emotions` plus mood/timbre
  // hints from the variation's production vector + era. Mirrors the
  // `auditionPrompt()` derivation in src/lib/audioPrompts.ts.
  const warmth = variation.production.warmth > 0.65 ? 'warm analog' : 'clean digital';
  const density =
    variation.production.density > 0.6
      ? 'layered arrangement'
      : variation.production.density < 0.4
      ? 'sparse arrangement'
      : 'moderate density';
  const brightness =
    variation.production.brightness > 0.6
      ? 'bright timbre'
      : variation.production.brightness < 0.4
      ? 'darker timbre'
      : 'balanced timbre';

  const archetypeDescriptors = [
    ...archetype.emotions.slice(0, 2),
    warmth,
    density,
    brightness,
    variation.era,
  ]
    .map(sanitize)
    .filter(Boolean);

  // AVD bias terms first, so they survive the 8-style cap. Two pillars of the
  // prompt — `felt-personalization` + `instrumental` — also get reserved slots.
  // Whatever space remains is filled by variation + archetype descriptors.
  const avdBias: string[] = [];
  if (avd) {
    const [arousal, valence, depth] = avd;
    if (arousal > 0.6) avdBias.push('alive');
    if (depth > 0.6) avdBias.push('harmonically rich');
    if (valence < 0.4) avdBias.push('bittersweet');
  }
  const reserved: string[] = [...avdBias, 'felt-personalization', 'instrumental'];
  const remaining = Math.max(0, 8 - reserved.length);
  const descriptorPool = [...variationDescriptors, ...archetypeDescriptors];
  const cappedGlobals = [...descriptorPool.slice(0, remaining), ...reserved];

  const negative_global_styles = [
    'aggressive',
    'distorted',
    'shouting vocals',
  ];

  const sections: CompositionSection[] = SECTION_NAMES.map((name, i) => {
    const bias = SECTION_STYLE_BIAS[name];
    return {
      section_name: name,
      positive_local_styles: bias.positive,
      negative_local_styles: bias.negative,
      duration_ms: SECTION_DURATIONS_MS[i],
    };
  });

  return {
    positive_global_styles: cappedGlobals,
    negative_global_styles,
    sections,
  };
}
