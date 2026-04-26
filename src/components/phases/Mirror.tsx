'use client';

import { useEffect, useMemo, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Fermata, Marcato, Tremolo, Linea } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { scoreArchetypes, getTimeOfDayLine } from '@/lib/scoring';

export function Mirror() {
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const setPhase = useStore((s) => s.setPhase);

  const top = useMemo(
    () => scoreArchetypes(pairChoices, pairLatencies, emotionTiles)[0],
    [pairChoices, pairLatencies, emotionTiles]
  );
  const timeLine = useMemo(() => getTimeOfDayLine(), []);

  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 3500),
      setTimeout(() => setStage(4), 5000),
      setTimeout(() => setStage(5), 6500),
      setTimeout(() => setStage(6), 8000),
      setTimeout(() => setStage(7), 9500),
      setTimeout(() => setStage(8), 11000),
      // Hand off to the Wait phase after the full reveal sits for ~3s.
      setTimeout(() => setPhase(6), 14000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [setPhase]);

  return (
    <Score
      variant="dark"
      pageTitle="vi. mirror"
      pageNumber="—"
      footer="a name for this hour"
      overlay={
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingTop: '14%',
            paddingLeft: 28,
            paddingRight: 28,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: COLORS.scoreAmber,
              textAlign: 'center',
              opacity: stage >= 1 ? 1 : 0,
              transition: 'opacity 1.4s ease-out',
              marginBottom: 18,
            }}
          >
            — a name for this hour —
          </div>
          <h1
            style={{
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(38px, 9vw, 56px)',
              lineHeight: 1.05,
              color: COLORS.inkDark,
              textAlign: 'center',
              margin: '4px 0 8px',
              opacity: stage >= 1 ? 1 : 0,
              transform: stage >= 1 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 1.4s ease-out, transform 1.4s ease-out',
              letterSpacing: '-0.01em',
            }}
          >
            {top.name}
          </h1>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: COLORS.inkDarkSecondary,
              textAlign: 'center',
              opacity: stage >= 2 ? 1 : 0,
              transition: 'opacity 1.4s ease-out',
              marginBottom: 38,
            }}
          >
            {top.variation}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {top.forer.map((line, i) => {
              const visible = stage >= 3 + i;
              return (
                <p
                  key={i}
                  style={{
                    fontFamily: FONTS.serif,
                    fontStyle: 'italic',
                    fontSize: 17,
                    lineHeight: 1.55,
                    color: i === 3 ? COLORS.inkDarkSecondary : COLORS.inkDark,
                    marginBottom: 14,
                    opacity: visible ? 0.94 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
                  }}
                >
                  {line}
                </p>
              );
            })}
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 16,
                color: COLORS.scoreAmber,
                marginTop: 18,
                opacity: stage >= 7 ? 1 : 0,
                transform: stage >= 7 ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
              }}
            >
              {timeLine}
            </p>
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 19,
                color: COLORS.scoreAmber,
                marginTop: 32,
                marginBottom: 24,
                textAlign: 'center',
                opacity: stage >= 8 ? 1 : 0,
                transform: stage >= 8 ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 1.6s ease-out, transform 1.6s ease-out',
              }}
            >
              I have something for you.
            </p>
          </div>
        </div>
      }
    >
      {/* Decorative marks framing the page — fade in with title */}
      <g
        transform={`translate(${VB_W / 2}, 70)`}
        style={{ opacity: stage >= 1 ? 0.7 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Marcato size={14} color={COLORS.scoreAmber} />
      </g>
      <g
        transform={`translate(${MARGIN_X + 30}, 130)`}
        style={{ opacity: stage >= 2 ? 0.5 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Tremolo size={14} color={COLORS.inkDarkSecondary} />
      </g>
      <g
        transform={`translate(${VB_W - MARGIN_X - 30}, 130)`}
        style={{ opacity: stage >= 2 ? 0.5 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Tremolo size={14} color={COLORS.inkDarkSecondary} />
      </g>
      <g
        transform={`translate(${VB_W / 2}, 580)`}
        style={{ opacity: stage >= 8 ? 0.85 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Fermata size={20} color={COLORS.scoreAmber} />
      </g>
      <g
        transform={`translate(${MARGIN_X}, 600)`}
        style={{ opacity: stage >= 8 ? 0.4 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Linea size={VB_W - MARGIN_X * 2} dip="left" color={COLORS.inkDarkSecondary} />
      </g>
    </Score>
  );
}
