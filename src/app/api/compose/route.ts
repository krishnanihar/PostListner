import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isOfflineMode } from '@/lib/env';

/**
 * POST /api/compose
 *
 * Body: { prompt: string, lengthMs: number, seed?: number, key?: string,
 *         forceInstrumental?: boolean, bucket?: 'pairs' | 'gems' | 'audition' | 'session' }
 * Returns: audio/mpeg
 *
 * Proxies to ElevenLabs Music. If `key` is provided and the bucket is one of
 * the static buckets (`pairs`, `gems`, `audition`), the result is cached to
 * `public/audio/{bucket}/{key}.mp3` so subsequent requests are free. Session
 * tracks are not cached.
 */

export const runtime = 'nodejs';

interface ComposeRequest {
  prompt?: string;
  lengthMs?: number;
  seed?: number;
  key?: string;
  forceInstrumental?: boolean;
  bucket?: 'pairs' | 'gems' | 'audition' | 'session';
}

const BUCKET_DIR: Record<string, string> = {
  pairs: 'public/audio/pairs',
  gems: 'public/audio/gems',
  audition: 'public/audio/audition',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });
  }

  let body: ComposeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  const lengthMs = body.lengthMs ?? 30000;
  const bucket = body.bucket ?? 'session';
  const cacheKey = body.key;

  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  if (lengthMs < 3000 || lengthMs > 600000) {
    return NextResponse.json({ error: 'lengthMs must be 3000–600000' }, { status: 400 });
  }

  // Cache check (only static buckets).
  let cachePath: string | null = null;
  if (cacheKey && BUCKET_DIR[bucket]) {
    const dir = join(process.cwd(), BUCKET_DIR[bucket]);
    await mkdir(dir, { recursive: true });
    cachePath = join(dir, `${cacheKey}.mp3`);
    if (existsSync(cachePath)) {
      return new NextResponse(createReadStream(cachePath) as unknown as ReadableStream, {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'hit' },
      });
    }
  }

  // Offline mode: refuse live music generation. Static buckets fall back to
  // cache-only above; session-mode requests get a 404.
  if (isOfflineMode()) {
    return NextResponse.json(
      { error: 'offline mode', cached: false },
      { status: 404, headers: { 'X-Offline': '1' } }
    );
  }

  const url =
    'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';
  const requestBody: Record<string, unknown> = {
    prompt,
    music_length_ms: lengthMs,
    model_id: 'music_v1',
  };
  // `seed` is incompatible with `prompt` per the ElevenLabs Music API —
  // only used when posting a structured composition_plan. Prompt-mode
  // requests omit seed entirely.
  if (body.forceInstrumental != null) requestBody.force_instrumental = body.forceInstrumental;

  const elevenRes = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(requestBody),
  });

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    return NextResponse.json(
      { error: 'elevenlabs error', status: elevenRes.status, detail: errText },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await elevenRes.arrayBuffer());
  if (cachePath) {
    await writeFile(cachePath, buf).catch((e) => {
      console.error('compose: cache write failed', e);
    });
  }

  return new NextResponse(buf, {
    headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': cachePath ? 'miss' : 'no-store' },
  });
}
