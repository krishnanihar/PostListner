import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PAIRS } from '@/data/pairs';
import { ARCHETYPES } from '@/data/archetypes';
import {
  pairClipPrompt,
  pairClipKey,
  GEMS_PROMPTS,
  auditionPrompt,
  auditionKey,
} from '@/lib/audioPrompts';
import { isOfflineMode } from '@/lib/env';

/**
 * POST /api/admin/generate
 *
 * Sweeps all static audio buckets and generates anything missing via the
 * ElevenLabs Music API. Idempotent — only generates what isn't already
 * cached on disk. Use ?dryRun=1 to preview the work without spending.
 *
 * Buckets:
 *   - pairs:    18 clips (Phase 1, 8s each)
 *   - gems:     3 excerpts (Phase 2, 15s each)
 *   - audition: 24 clips (Phase 4, 30s each — one per variation)
 *
 * Concurrency is capped at MAX_CONCURRENT to keep within ElevenLabs
 * rate limits.
 */

export const runtime = 'nodejs';
export const maxDuration = 300; // allow up to 5 min for the batch

const MAX_CONCURRENT = 2;
const PAIR_LENGTH_MS = 8000;
const GEMS_LENGTH_MS = 15000;
const AUDITION_LENGTH_MS = 30000;

interface Job {
  bucket: 'pairs' | 'gems' | 'audition';
  key: string;
  prompt: string;
  lengthMs: number;
  seed?: number;
}

function buildJobs(): Job[] {
  const jobs: Job[] = [];
  // Pair clips (18 total — 9 pairs × 2 sides).
  PAIRS.forEach((pair, i) => {
    (['a', 'b'] as const).forEach((side) => {
      const opt = pair[side];
      jobs.push({
        bucket: 'pairs',
        key: pairClipKey(pair.axis, side),
        prompt: pairClipPrompt(pair.axis, opt),
        lengthMs: PAIR_LENGTH_MS,
        seed: 1000 + i * 2 + (side === 'b' ? 1 : 0),
      });
    });
  });
  // GEMS excerpts.
  GEMS_PROMPTS.forEach((g, i) => {
    jobs.push({
      bucket: 'gems',
      key: g.key,
      prompt: g.prompt,
      lengthMs: GEMS_LENGTH_MS,
      seed: 2000 + i,
    });
  });
  // Audition clips (24 — one per variation).
  ARCHETYPES.forEach((arc) => {
    arc.variations.forEach((v, i) => {
      jobs.push({
        bucket: 'audition',
        key: auditionKey(v),
        prompt: auditionPrompt(arc, v),
        lengthMs: AUDITION_LENGTH_MS,
        seed: 3000 + ARCHETYPES.indexOf(arc) * 10 + i,
      });
    });
  });
  return jobs;
}

function bucketDir(bucket: Job['bucket']): string {
  return join(process.cwd(), 'public', 'audio', bucket);
}

function jobPath(job: Job): string {
  return join(bucketDir(job.bucket), `${job.key}.mp3`);
}

async function runOne(apiKey: string, job: Job): Promise<{ ok: boolean; error?: string; bytes?: number }> {
  const url = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';
  // ElevenLabs Music: `seed` is incompatible with `prompt` (only works with
  // `composition_plan`). We're prompt-only here, so seed is intentionally
  // omitted — reproducibility is sacrificed for prompt-mode simplicity.
  const body: Record<string, unknown> = {
    prompt: job.prompt,
    music_length_ms: job.lengthMs,
    model_id: 'music_v1',
    force_instrumental: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(bucketDir(job.bucket), { recursive: true });
  await writeFile(jobPath(job), buf);
  return { ok: true, bytes: buf.length };
}

async function runWithConcurrency<T>(
  jobs: Job[],
  fn: (j: Job) => Promise<T>,
  cap: number
): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const i = cursor++;
      results[i] = await fn(jobs[i]);
    }
  }
  await Promise.all(Array.from({ length: cap }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1';
  const bucketFilter = url.searchParams.get('bucket') as Job['bucket'] | null;

  const allJobs = buildJobs();
  const jobs = bucketFilter ? allJobs.filter((j) => j.bucket === bucketFilter) : allJobs;

  // Filter to only missing files.
  const missing = jobs.filter((j) => !existsSync(jobPath(j)));
  const summary = {
    total: jobs.length,
    cached: jobs.length - missing.length,
    toGenerate: missing.length,
    byBucket: {
      pairs: missing.filter((j) => j.bucket === 'pairs').length,
      gems: missing.filter((j) => j.bucket === 'gems').length,
      audition: missing.filter((j) => j.bucket === 'audition').length,
    },
  };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      ...summary,
      sample: missing.slice(0, 3).map((j) => ({ bucket: j.bucket, key: j.key, prompt: j.prompt })),
    });
  }

  if (missing.length === 0) {
    return NextResponse.json({ done: true, ...summary, message: 'all assets already cached' });
  }

  // Offline mode: refuse live generation. Run dryRun=1 to preview, then
  // unset NEXT_PUBLIC_POSTLISTENER_OFFLINE in .env.local to actually run.
  if (isOfflineMode()) {
    return NextResponse.json(
      {
        error: 'offline mode',
        message:
          'live ElevenLabs calls disabled — set NEXT_PUBLIC_POSTLISTENER_OFFLINE=0 in .env.local to enable',
        ...summary,
      },
      { status: 503, headers: { 'X-Offline': '1' } }
    );
  }

  const started = Date.now();
  const results = await runWithConcurrency(missing, (j) => runOne(apiKey, j), MAX_CONCURRENT);
  const elapsedMs = Date.now() - started;
  const ok = results.filter((r) => r.ok).length;
  const failed = results
    .map((r, i) => (r.ok ? null : { ...missing[i], error: r.error }))
    .filter(Boolean);

  return NextResponse.json({
    done: true,
    ...summary,
    succeeded: ok,
    failed: failed.length,
    failures: failed,
    elapsedMs,
  });
}
