'use client';

import { useEffect, useRef, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { BreathPacer } from '@/score/BreathPacer';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { resolveSelection } from '@/lib/scoring';

/**
 * Demo: Phase 9 always plays this hand-baked 6-min track + 4 demucs stems.
 * The rite's selection still drives Mirror's archetype paragraphs upstream;
 * this only overrides the audio source for Wait/Reveal/Listening so the
 * deploy doesn't depend on a live ElevenLabs+demucs pipeline.
 *
 * To restore the original live composition flow, you'll need to bring back
 * the deleted pieces (see CLAUDE.md "Demo mode — temporary"):
 *   - src/app/api/compose/route.ts
 *   - src/lib/compositionPlan.ts
 *   - the live-fetch useEffect logic in this file (git history)
 * Re-generate the source mp3 with `node scripts/generate-demo-track.mjs`.
 */
const DEMO_TRACK = {
  id: 'late_night_2020s_neoclassical',
  tag: '2020s · neo-classical for the hours after',
} as const;

/**
 * Phase 7 — Composing. Three-act ritual wait per Research/wait-as-ritual:
 *   i. separation     · request kicked, narration slows
 *   ii. liminality    · audio acquired, breath pacer holds presence
 *   iii. incorporation· silence gap before the title appears in Reveal
 *
 * Drives the real generation pipeline (or the offline fallback to a
 * pre-rendered audition track) and stores the resulting URL + title in
 * the zustand store so Reveal and Listening can consume it.
 */

const ACTS = [
  { i: 'i.',   line: 'listening to your spectrum…' },
  { i: 'ii.',  line: 'weighing the songs you carry…' },
  { i: 'iii.', line: 'setting it down.' },
];

// Minimum time act i must hold even if generation returns instantly. The
// ritual needs duration; without it the act flashes by. Real composition_plan
// generations take ~60–120s, so 60s covers most live generations and keeps
// the title from appearing before the audio is ready.
const ACT0_MIN_MS = 60_000;
// Time act ii holds once the audio is acquired (buffer + presence).
const ACT1_HOLD_MS = 18_000;
// The honored silence between act iii and Reveal — Bregman gap before the
// first heard note (Research/wait-as-ritual §incorporation).
const ACT2_SILENCE_MS = 4_500;
export function Wait() {
  const setPhase = useStore((s) => s.setPhase);
  const setSessionTrack = useStore((s) => s.setSessionTrack);
  const setSessionStems = useStore((s) => s.setSessionStems);
  const sessionGenStatus = useStore((s) => s.sessionGenStatus);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);

  const [elapsed, setElapsed] = useState(0);
  const [audioReadyAt, setAudioReadyAt] = useState<number | null>(null);
  const startRef = useRef<number>(0);

  // Resolve the matched archetype + variation once, deterministically.
  // Mirror still consumes this for its archetype paragraphs; Wait only uses
  // the title fallback when DEMO_TRACK is null.
  const selectionRef = useRef(
    resolveSelection({
      pairChoices,
      pairLatencies,
      emotionTiles,
      songYears,
      tapBPM,
      epsilon: 0,
    })
  );

  // Wire the demo track on mount. Static URLs only — no network call.
  useEffect(() => {
    const title = DEMO_TRACK?.tag ?? selectionRef.current?.variation.tag ?? 'A piece for you';
    setSessionTrack(null, title, 'composing');

    if (DEMO_TRACK) {
      const audioUrl = `/audio/audition/${DEMO_TRACK.id}.mp3`;
      const stems = {
        vocals: `/audio/stems/${DEMO_TRACK.id}/vocals.mp3`,
        drums:  `/audio/stems/${DEMO_TRACK.id}/drums.mp3`,
        bass:   `/audio/stems/${DEMO_TRACK.id}/bass.mp3`,
        other:  `/audio/stems/${DEMO_TRACK.id}/other.mp3`,
      };
      setSessionTrack(audioUrl, title, 'fallback');
      setSessionStems(stems);
      setAudioReadyAt(performance.now());
      return;
    }

    // DEMO_TRACK was set to null — degenerate path until live compose is
    // re-wired. Use the picked variation's audition file with no stems.
    const sel = selectionRef.current;
    if (sel) {
      setSessionTrack(`/audio/audition/${sel.variation.id}.mp3`, title, 'fallback');
    } else {
      setSessionTrack(null, title, 'error');
    }
    setAudioReadyAt(performance.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick — drives both the visual progress and the act-transition logic.
  useEffect(() => {
    startRef.current = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - startRef.current);
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Determine act from elapsed + readiness. Act i holds until BOTH (audio
  // acquired) AND (min hold elapsed). Act ii is a fixed-duration buffer.
  // Act iii is a silence gap that ends in setPhase(8).
  const act0Done =
    audioReadyAt !== null &&
    elapsed >= ACT0_MIN_MS;
  const act1Start = audioReadyAt !== null ? Math.max(audioReadyAt - startRef.current, ACT0_MIN_MS) : null;
  const act1Done = act1Start !== null && elapsed >= act1Start + ACT1_HOLD_MS;
  const act2Start = act1Start !== null ? act1Start + ACT1_HOLD_MS : null;
  const act2Done = act2Start !== null && elapsed >= act2Start + ACT2_SILENCE_MS;

  let actIdx = 0;
  let actProgress = 0;
  if (!act0Done) {
    actIdx = 0;
    actProgress = Math.min(1, elapsed / ACT0_MIN_MS);
  } else if (!act1Done && act1Start !== null) {
    actIdx = 1;
    actProgress = Math.min(1, (elapsed - act1Start) / ACT1_HOLD_MS);
  } else if (!act2Done && act2Start !== null) {
    actIdx = 2;
    actProgress = Math.min(1, (elapsed - act2Start) / ACT2_SILENCE_MS);
  } else {
    actIdx = ACTS.length;
  }

  // Advance to Reveal once act iii completes.
  useEffect(() => {
    if (act2Done) setPhase(8);
  }, [act2Done, setPhase]);

  // Backward-filling progress stave covering the full ritual. Total horizon
  // is approximate (we don't know gen latency in advance) — use ACT0_MIN +
  // act1 + act2 as the nominal arc, capped at 1.
  const nominalTotal = ACT0_MIN_MS + ACT1_HOLD_MS + ACT2_SILENCE_MS;
  const overall = Math.min(1, elapsed / nominalTotal);
  const easedOverall = 1 - Math.pow(1 - overall, 1.4);
  const filledX = MARGIN_X + (VB_W - MARGIN_X * 2) * (1 - easedOverall);
  const PROGRESS_Y = 540;

  // Status crumb in the footer area — informative without breaking the
  // ritual frame. "live" when a real generation succeeded; "from the
  // archive" when we used the pre-rendered audition.
  const footerStatus =
    sessionGenStatus === 'ready'
      ? 'composing · live'
      : sessionGenStatus === 'fallback'
      ? 'composing · from the archive'
      : sessionGenStatus === 'error'
      ? 'composing · from the archive'
      : 'composing · listening';

  return (
    <Score
      variant="cream"
      pageTitle="vii. composing"
      pageNumber="—"
      voiceCue={actIdx >= 2 ? '' : 'breathe with the line. it is being made.'}
      footer={footerStatus}
    >
      {/* Breath pacer at upper-third. Fades out under act iii so the silence
          feels intentional rather than mid-ritual. */}
      <g
        transform={`translate(${VB_W / 2}, 200)`}
        opacity={actIdx >= 2 ? 0.15 : 1}
        style={{ transition: 'opacity 1.4s ease-out' }}
      >
        <BreathPacer bpm={5.5} size={80} color={COLORS.inkCream} opacity={0.85} />
      </g>

      {ACTS.map((act, i) => {
        const completed = i < actIdx;
        const active = i === actIdx;
        const upcoming = i > actIdx;
        const opacity = upcoming ? 0.25 : 1;
        const y = 320 + i * 32;
        const text = `${act.i}  ${act.line}`;
        return (
          <g key={i} opacity={opacity}>
            <text
              x={MARGIN_X}
              y={y}
              fill={active ? COLORS.scoreAmber : COLORS.inkCream}
              fontSize="14"
              fontFamily={FONTS.serif}
              fontStyle="italic"
            >
              {text}
            </text>
            {completed && (
              <line
                x1={MARGIN_X}
                y1={y - 4}
                x2={VB_W - MARGIN_X}
                y2={y - 4}
                stroke={COLORS.inkCreamSecondary}
                strokeWidth="0.7"
                opacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}

      <g>
        <line
          x1={MARGIN_X}
          y1={PROGRESS_Y}
          x2={VB_W - MARGIN_X}
          y2={PROGRESS_Y}
          stroke={COLORS.inkCreamSecondary}
          strokeWidth="0.5"
          opacity="0.35"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={filledX}
          y1={PROGRESS_Y}
          x2={VB_W - MARGIN_X}
          y2={PROGRESS_Y}
          stroke={COLORS.inkCream}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {actIdx < ACTS.length && (
        <circle
          cx={MARGIN_X + (VB_W - MARGIN_X * 2) * actProgress}
          cy={320 + actIdx * 32 + 6}
          r="1.6"
          fill={COLORS.scoreAmber}
        />
      )}
    </Score>
  );
}
