'use client';

import { useEffect, useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';

const T_HEADPHONES = 0;
const T_TITLE_AT = 0;
const T_LINE_DRAW = 1800;
const T_LINE1 = 4000;
const T_LINE2 = 7500;

type Stage = 'headphones' | 'title' | 'voice';

export function Threshold() {
  const [stage, setStage] = useState<Stage>('headphones');
  const [lineDrawn, setLineDrawn] = useState(false);
  const [showLine1, setShowLine1] = useState(false);
  const [showLine2, setShowLine2] = useState(false);

  useEffect(() => {
    if (stage !== 'voice') return;
    const timers: number[] = [];
    const t = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };
    t(T_LINE_DRAW, () => setLineDrawn(true));
    t(T_LINE1, () => setShowLine1(true));
    t(T_LINE2, () => setShowLine2(true));
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const onTap = () => {
    if (stage === 'headphones') {
      setStage('title');
      setTimeout(() => setStage('voice'), 2500);
    }
  };

  return (
    <div onClick={onTap} style={{ position: 'absolute', inset: 0, cursor: stage === 'headphones' ? 'pointer' : 'default' }}>
      <Paper variant="cream">
        {stage === 'headphones' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
              animation: 'sceneFade 0.8s ease-out',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.inkCreamSecondary}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: COLORS.inkCreamSecondary,
                letterSpacing: '0.03em',
              }}
            >
              wear headphones
            </span>
            <span
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: COLORS.scoreAmber,
                marginTop: 24,
                animation: 'breathing 2.5s ease-in-out infinite',
              }}
            >
              tap to begin
            </span>
          </div>
        )}

        {stage === 'title' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'sceneFade 0.8s ease-out',
            }}
          >
            <h1
              style={{
                fontFamily: FONTS.serif,
                fontWeight: 400,
                fontSize: 'clamp(32px, 9vw, 48px)',
                letterSpacing: '0.18em',
                color: COLORS.inkCream,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              POST<br />LISTENER
            </h1>
            <p
              style={{
                fontFamily: FONTS.mono,
                fontSize: 10,
                color: COLORS.inkCreamSecondary,
                letterSpacing: '0.08em',
                marginTop: 16,
              }}
            >
              a musical identity instrument
            </p>
          </div>
        )}

        {stage === 'voice' && (
          <div style={{ position: 'absolute', inset: 0, animation: 'sceneFade 1s ease-out' }}>
            <svg
              viewBox="0 0 360 600"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <path
                d="M120 280 Q170 250 220 270 Q260 286 280 260"
                stroke={COLORS.inkCream}
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 200,
                  strokeDashoffset: lineDrawn ? 0 : 200,
                  transition: 'stroke-dashoffset 4s ease-in-out',
                }}
              />
              {lineDrawn && (
                <circle
                  cx="280"
                  cy="260"
                  r="2.5"
                  fill={COLORS.inkCream}
                  style={{ opacity: 0, animation: 'fadeIn 1s 4s ease-out forwards' }}
                />
              )}
            </svg>

            <div
              style={{
                position: 'absolute',
                bottom: '32%',
                left: 24,
                right: 24,
                textAlign: 'center',
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 17,
                color: COLORS.inkCream,
                lineHeight: 2,
              }}
            >
              <div
                style={{
                  opacity: showLine1 ? 0.9 : 0,
                  transition: 'opacity 1.5s ease-out',
                }}
              >
                listen, and lean
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: COLORS.inkCreamSecondary,
                  opacity: showLine2 ? 0.7 : 0,
                  transition: 'opacity 1.5s ease-out',
                }}
              >
                do not decide
              </div>
            </div>
          </div>
        )}
      </Paper>

      <style jsx>{`
        @keyframes breathing {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.95; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
