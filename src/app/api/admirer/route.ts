import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  REGISTER_SETTINGS,
  DEFAULT_VOICE_ID,
  ELEVENLABS_TTS_MODEL,
  admirerCacheKey,
  type AdmirerRegister,
} from '@/lib/admirer';
import { isOfflineMode } from '@/lib/env';

/**
 * POST /api/admirer
 *
 * Body: { text: string, register: AdmirerRegister }
 * Returns: audio/mpeg stream
 *
 * Proxies to ElevenLabs TTS (eleven_v3). Caches generated audio to
 * `public/audio/admirer/{key}.mp3` keyed on (text, register) so the same
 * line is served from disk on replay, never re-billed.
 */

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'audio', 'admirer');

interface AdmirerRequest {
  text?: string;
  register?: AdmirerRegister;
  voiceId?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });
  }

  let body: AdmirerRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  const register: AdmirerRegister = body.register ?? 'caretaking';
  const voiceId = body.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (!REGISTER_SETTINGS[register]) {
    return NextResponse.json({ error: `unknown register: ${register}` }, { status: 400 });
  }

  // Cache check.
  await mkdir(CACHE_DIR, { recursive: true });
  const key = admirerCacheKey(text, register);
  // admirerCacheKey() returns base36 from DJB2, but validate defensively
  // before trusting it as a path component.
  if (!/^[a-z0-9]{1,32}$/.test(key)) {
    return NextResponse.json({ error: 'invalid cache key' }, { status: 500 });
  }
  const cachePath = join(CACHE_DIR, `${key}.mp3`);
  if (existsSync(cachePath)) {
    return new NextResponse(createReadStream(cachePath) as unknown as ReadableStream, {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'hit' },
    });
  }

  // Offline mode: refuse live calls, return 404 so the client falls silent.
  if (isOfflineMode()) {
    return NextResponse.json(
      { error: 'offline mode', cached: false, key },
      { status: 404, headers: { 'X-Offline': '1' } }
    );
  }

  // Live call.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const elevenRes = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_TTS_MODEL,
      voice_settings: REGISTER_SETTINGS[register],
    }),
  });

  if (!elevenRes.ok) {
    const errText = await elevenRes.text();
    return NextResponse.json(
      { error: 'elevenlabs error', status: elevenRes.status, detail: errText },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await elevenRes.arrayBuffer());
  // Persist to cache, but do not block the response on disk write.
  writeFile(cachePath, buf).catch((e) => {
    console.error('admirer: cache write failed', e);
  });

  return new NextResponse(buf, {
    headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'miss' },
  });
}
