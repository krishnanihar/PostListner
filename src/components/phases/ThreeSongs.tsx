'use client';

import { useEffect, useRef } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Vox } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { SONG_PROMPTS } from '@/data/songs';
import { useStore } from '@/lib/store';

const STAVE_Y = 360;
const STAVE_WIDTH = VB_W - MARGIN_X * 2;

export function ThreeSongs() {
  const songIndex = useStore((s) => s.songIndex);
  const songs = useStore((s) => s.songs);
  const setSong = useStore((s) => s.setSong);
  const nextSong = useStore((s) => s.nextSong);

  const inputRef = useRef<HTMLInputElement>(null);
  const prompt = SONG_PROMPTS[songIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, [songIndex]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      if (value) {
        setSong(songIndex, value);
        nextSong();
      }
    }
  };

  // a Vox mark for each song already entered
  const voxMarks = songs.slice(0, songIndex).map((_, i) => i);

  return (
    <Score
      variant="cream"
      pageTitle="iv. carry"
      pageNumber={`${songIndex + 1} / 3`}
      voiceCue="take your time. the wrong one would feel wrong."
      staves={[{ y: STAVE_Y - 20, opacity: 0.3 }]}
      overlay={
        <>
          <div
            style={{
              position: 'absolute',
              top: '18%',
              left: 28,
              right: 28,
              textAlign: 'center',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 22,
              lineHeight: 1.4,
              color: COLORS.inkCream,
              letterSpacing: '-0.005em',
            }}
          >
            {prompt.line.toLowerCase()}
          </div>

          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: 28,
              right: 28,
              borderBottom: `1px solid ${COLORS.inkCream}`,
              paddingBottom: 6,
            }}
          >
            <input
              key={songIndex}
              ref={inputRef}
              className="score-input"
              placeholder="a song, an artist, a feeling…"
              defaultValue={songs[songIndex]}
              autoComplete="off"
              onKeyDown={onKeyDown}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '54%',
              left: 28,
              right: 28,
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.18em',
              color: COLORS.inkCreamSecondary,
            }}
          >
            {prompt.meta}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '23%',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: COLORS.inkCreamSecondary,
            }}
          >
            press enter to continue
          </div>
        </>
      }
    >
      {voxMarks.map((i) => {
        const x = MARGIN_X + 20 + i * 28;
        return (
          <g key={i} transform={`translate(${x}, ${STAVE_Y - 26})`}>
            <Vox size={10} color={COLORS.inkCream} opacity={0.7} />
          </g>
        );
      })}
    </Score>
  );
}
