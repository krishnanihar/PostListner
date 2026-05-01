'use client';

/**
 * Phase 5 — Reflection (NEW). The bridge from input to output.
 *
 * Per the stealable-techniques memo: "PostListener's single most important
 * design element — it is where the 'being seen' feeling is manufactured."
 * Replika, ChatGPT, Midjourney, and Stanford's Riff chatbot all do it.
 *
 * Renders each Phase 1–4 signal as a single italic line, fading in one by
 * one. The final line is the handoff into Mirror.
 */

import { useEffect, useMemo, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { buildReflection } from '@/lib/reflection';
import { AdmirerLine } from '@/components/AdmirerLine';

const HEAD_DELAY_MS = 700;
/** Stretched from 1500ms to give voice room (~2–3s per line). */
const LINE_INTERVAL_MS = 2400;
const FINAL_HOLD_MS = 2400;

/** Phase index of Mirror after Reflection insertion. */
const MIRROR_PHASE = 6;

export function Reflection() {
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const pairAlmosts = useStore((s) => s.pairAlmosts);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songs = useStore((s) => s.songs);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);
  const userName = useStore((s) => s.userName);
  const setPhase = useStore((s) => s.setPhase);

  const lines = useMemo(
    () => buildReflection({ pairChoices, pairLatencies, pairAlmosts, emotionTiles, songs, songYears, tapBPM }),
    [pairChoices, pairLatencies, pairAlmosts, emotionTiles, songs, songYears, tapBPM]
  );

  const [visible, setVisible] = useState(0);

  useEffect(() => {
    // `cancelled` defends against the (rare) case where the dependencies
    // change while still mounted: clearTimeout would normally suffice, but
    // a callback already in the microtask queue could still resurrect a
    // stale `visible` index on top of newer state.
    let cancelled = false;
    const timers: number[] = [];
    lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => {
        if (!cancelled) setVisible(i + 1);
      }, HEAD_DELAY_MS + i * LINE_INTERVAL_MS));
    });
    const totalLineTime = HEAD_DELAY_MS + lines.length * LINE_INTERVAL_MS;
    timers.push(window.setTimeout(() => {
      if (!cancelled) setPhase(MIRROR_PHASE);
    }, totalLineTime + FINAL_HOLD_MS));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [lines.length, setPhase]);

  const headerName = userName ? `here is what i heard, ${userName.toLowerCase()}` : 'here is what i heard';

  return (
    <Score
      variant="cream"
      pageTitle="vi. reflection"
      pageNumber="—"
      voiceCue={headerName}
      footer="reading you back to you"
      overlay={
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 32,
            paddingRight: 32,
            gap: 22,
          }}
        >
          {/* Voice each Reflection line in sync with its visual fade-in.
              The amber final line uses Present register; the rest are
              Caretaking. Each starts fetching at mount; delayMs drives
              when playback begins. */}
          {lines.map((line, i) => (
            <AdmirerLine
              key={`v-${i}`}
              text={line.text}
              register={line.emphasis === 'amber' ? 'present' : 'caretaking'}
              delayMs={HEAD_DELAY_MS + i * LINE_INTERVAL_MS}
            />
          ))}
          {lines.map((line, i) => {
            const shown = i < visible;
            const isAmber = line.emphasis === 'amber';
            return (
              <div
                key={i}
                style={{
                  opacity: shown ? (isAmber ? 0.95 : 0.92) : 0,
                  transform: shown ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 1.6s ease-out, transform 1.6s ease-out',
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: isAmber ? 19 : 17,
                  lineHeight: 1.45,
                  color: isAmber ? COLORS.scoreAmber : COLORS.inkCream,
                  marginTop: isAmber ? 14 : 0,
                }}
              >
                {line.text}
                {line.annotation && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontFamily: FONTS.mono,
                      fontStyle: 'normal',
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      color: COLORS.inkCreamSecondary,
                      opacity: 0.7,
                    }}
                  >
                    {line.annotation}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      }
    >
      {/* A faint vertical guideline at the left margin — the "score" line for
          the reading. Picks up amber once the final line lands. */}
      <line
        x1={MARGIN_X + 8}
        y1={140}
        x2={MARGIN_X + 8}
        y2={520}
        stroke={visible >= lines.length ? COLORS.scoreAmber : COLORS.inkCreamSecondary}
        strokeWidth="0.5"
        opacity={visible > 0 ? 0.45 : 0}
        vectorEffect="non-scaling-stroke"
        style={{ transition: 'stroke 1.6s ease-out, opacity 1.2s ease-out' }}
      />
      {/* Subtle dot leader on the right — a reading rhythm marker. */}
      {[0.18, 0.30, 0.42, 0.54, 0.66, 0.78].map((t, i) => (
        <circle
          key={i}
          cx={VB_W - MARGIN_X - 8}
          cy={140 + (520 - 140) * t}
          r="1.2"
          fill={COLORS.inkCreamSecondary}
          opacity={i < visible ? 0.7 : 0.15}
          style={{ transition: 'opacity 1.2s ease-out' }}
        />
      ))}
    </Score>
  );
}
