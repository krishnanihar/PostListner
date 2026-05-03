#!/usr/bin/env node
// One-off: generate the demo Phase-9 track via ElevenLabs Music API.
//
// The composition_plan below is what `buildCompositionPlan()` in
// src/lib/compositionPlan.ts would output for the
// `mellow_contemplative / late_night_2020s_neoclassical` archetype/variation
// pair. Pre-computed here so this script has zero TS toolchain dependency —
// re-derive by tweaking the constants below if you want to demo a different
// pair.
//
// Usage:
//   node scripts/generate-demo-track.mjs
//
// Output:
//   public/audio/audition/late_night_2020s_neoclassical.mp3 (~5–6 MB)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(REPO_ROOT, 'public/audio/audition/late_night_2020s_neoclassical.mp3');

// Read ELEVENLABS_API_KEY from .env.local (avoid pulling in a dotenv dep).
function loadApiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const envPath = resolve(REPO_ROOT, '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\n]+)"?\s*$/);
    if (m) return m[1].trim();
  }
  throw new Error('ELEVENLABS_API_KEY not found in env or .env.local');
}

const compositionPlan = {
  positive_global_styles: [
    '2020s',
    'neo',
    'classical for the hours after',
    'nostalgic',
    'melancholic',
    'harmonically rich',
    'felt-personalization',
    'instrumental',
  ],
  negative_global_styles: ['aggressive', 'distorted', 'shouting vocals'],
  sections: [
    {
      section_name: 'threshold',
      positive_local_styles: ['centered', 'patient', 'restrained dynamics'],
      negative_local_styles: ['busy percussion'],
      duration_ms: 60_000,
      lines: [],
    },
    {
      section_name: 'release',
      positive_local_styles: ['widening', 'softening', 'expanding reverb'],
      negative_local_styles: ['tight', 'dry'],
      duration_ms: 90_000,
      lines: [],
    },
    {
      section_name: 'peak',
      positive_local_styles: ['suspended', 'enveloping', 'shimmering'],
      negative_local_styles: ['rhythmic drive'],
      duration_ms: 60_000,
      lines: [],
    },
    {
      section_name: 'return',
      positive_local_styles: ['gentle reorientation', 'warm low end'],
      negative_local_styles: ['harsh', 'bright'],
      duration_ms: 60_000,
      lines: [],
    },
    {
      section_name: 'homecoming',
      positive_local_styles: ['plagal warmth', 'amen cadence', 'simple'],
      negative_local_styles: ['tension', 'unresolved'],
      duration_ms: 60_000,
      lines: [],
    },
    {
      section_name: 'silence',
      positive_local_styles: ['fading', 'sustained tone', 'distant'],
      negative_local_styles: ['active', 'percussive'],
      duration_ms: 30_000,
      lines: [],
    },
  ],
};

const totalMs = compositionPlan.sections.reduce((s, x) => s + x.duration_ms, 0);
console.log(`composition: 6 sections totalling ${(totalMs / 1000).toFixed(0)}s`);
console.log(`globals: ${compositionPlan.positive_global_styles.join(', ')}`);

const apiKey = loadApiKey();
const t0 = Date.now();

const res = await fetch(
  'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',
  {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      model_id: 'music_v1',
      composition_plan: compositionPlan,
    }),
  }
);

if (!res.ok) {
  const text = await res.text();
  console.error(`elevenlabs error ${res.status}:`, text);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, buf);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`saved ${(buf.length / 1024).toFixed(0)}KB in ${elapsed}s → ${OUTPUT_PATH}`);
