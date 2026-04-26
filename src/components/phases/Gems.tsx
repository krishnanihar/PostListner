'use client';

import { useEffect, useState } from 'react';
import { Score, VB_W } from '@/score/Score';
import { Pneuma, Fermata } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { EXCERPTS } from '@/data/excerpts';
import { useStore } from '@/lib/store';

const TILE_REVEAL_MS = 1200;
const TILE_FADE_MS = 6000;
const EXCERPT_DURATION_MS = TILE_REVEAL_MS + TILE_FADE_MS + 1200;

const VIS_CX = VB_W / 2;
const VIS_CY = 230;

export function Gems() {
  const currentExcerpt = useStore((s) => s.currentExcerpt);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const toggleEmotionTile = useStore((s) => s.toggleEmotionTile);
  const nextExcerpt = useStore((s) => s.nextExcerpt);

  const ex = EXCERPTS[currentExcerpt];
  const selected = emotionTiles[currentExcerpt] ?? [];
  const [tilesShown, setTilesShown] = useState(false);

  useEffect(() => {
    setTilesShown(false);
    const reveal = window.setTimeout(() => setTilesShown(true), TILE_REVEAL_MS);
    const advance = window.setTimeout(() => nextExcerpt(), EXCERPT_DURATION_MS);
    return () => {
      clearTimeout(reveal);
      clearTimeout(advance);
    };
  }, [currentExcerpt, nextExcerpt]);

  const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi'][currentExcerpt] ?? '';
  const RING_RADII = [22, 38, 56];

  return (
    <Score
      variant="cream"
      pageTitle="iii. emotion"
      pageNumber={`${currentExcerpt + 1} / ${EXCERPTS.length}`}
      voiceCue={tilesShown ? 'mark anything that lands' : 'listen'}
      footer={`excerpt ${ROMAN} · 15s`}
      overlay={
        <>
          <div
            style={{
              position: 'absolute',
              top: '13%',
              left: 24,
              right: 24,
              textAlign: 'center',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 13,
              color: COLORS.inkCreamSecondary,
              letterSpacing: '0.04em',
            }}
          >
            {ex.name.toLowerCase()}
          </div>

          <div
            className="tile-row"
            style={{
              position: 'absolute',
              bottom: '24%',
              left: 24,
              right: 24,
              opacity: tilesShown ? 1 : 0,
              transition: 'opacity 0.6s',
            }}
          >
            {ex.tiles.map((t) => (
              <button
                key={t}
                type="button"
                className={`tile-word${selected.includes(t) ? ' selected' : ''}`}
                onClick={() => toggleEmotionTile(currentExcerpt, t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tilesShown && (
            <div
              style={{
                position: 'absolute',
                bottom: '17%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '50%',
                height: 1,
                background: COLORS.scoreAmber,
                animation: 'countdownBar 6s linear forwards',
              }}
            />
          )}
        </>
      }
    >
      {/* concentric rings of marks pulsing */}
      {RING_RADII.map((r, ringIdx) => {
        const count = 6 + ringIdx * 2;
        return (
          <g key={ringIdx} style={{ transformOrigin: `${VIS_CX}px ${VIS_CY}px` }}>
            {Array.from({ length: count }, (_, i) => {
              const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
              const x = VIS_CX + Math.cos(angle) * r;
              const y = VIS_CY + Math.sin(angle) * r;
              const Mark = ringIdx % 2 === 0 ? Pneuma : Fermata;
              return (
                <g
                  key={i}
                  transform={`translate(${x}, ${y})`}
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    animation: `markPulse 3.6s ease-in-out infinite`,
                    animationDelay: `${(ringIdx * 0.3 + i * 0.04).toFixed(2)}s`,
                  }}
                >
                  <Mark size={6} color={COLORS.inkCream} opacity={0.4} />
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx={VIS_CX} cy={VIS_CY} r="3" fill={COLORS.scoreAmber} opacity="0.7" />

      <style>{`
        @keyframes markPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes countdownBar {
          from { width: 50%; }
          to { width: 0%; }
        }
      `}</style>
    </Score>
  );
}
