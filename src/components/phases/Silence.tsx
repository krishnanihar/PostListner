'use client';

/**
 * Phase 10 — Threshold of Silence + post-experience integration.
 * Per Research/ego-dissolution-postlistener-architecture §The return,
 * structured as Punchdrunk's Manderley-bar decompression analogue.
 *
 * Stages:
 *   0  silence-hold (8s) — first held silence after the music
 *   1  arrival       — "the room is yours."
 *   2  grounding     — "feel the weight of the headphones."
 *   3  normalize     — "whatever you experienced is a normal response."
 *   4  reflect       — optional journaling field (local-only)
 *   5  artifact      — archetype + variation + take-home button
 */

import { useEffect, useMemo, useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { resolveSelection } from '@/lib/scoring';
import { buildTakeHome } from '@/lib/takeHome';

const STAGES = ['silence', 'arrival', 'grounding', 'normalize', 'reflect', 'artifact'] as const;
type Stage = typeof STAGES[number];

const STAGE_HOLD_MS: Record<Stage, number> = {
  silence:   8000,
  arrival:   4500,
  grounding: 6000,
  normalize: 6000,
  reflect:   0, // user-driven — advance via button
  artifact:  0, // user-driven
};

export function Silence() {
  const userName = useStore((s) => s.userName);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);
  const sessionTrackTitle = useStore((s) => s.sessionTrackTitle);

  const [stage, setStage] = useState<Stage>('silence');
  const [reflection, setReflection] = useState('');

  const selection = useMemo(
    () => resolveSelection({ pairChoices, pairLatencies, emotionTiles, songYears, tapBPM, epsilon: 0 }),
    [pairChoices, pairLatencies, emotionTiles, songYears, tapBPM]
  );

  // Auto-advance through the timed stages.
  useEffect(() => {
    const hold = STAGE_HOLD_MS[stage];
    if (hold === 0) return;
    const t = window.setTimeout(() => {
      const idx = STAGES.indexOf(stage);
      if (idx >= 0 && idx < STAGES.length - 1) setStage(STAGES[idx + 1]);
    }, hold);
    return () => clearTimeout(t);
  }, [stage]);

  const onTakeHome = () => {
    if (!selection) return;
    const payload = buildTakeHome({
      userName,
      archetype: selection.archetype.name,
      variation: selection.variation.tag,
      title: sessionTrackTitle,
    });
    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `postlistener-${selection.archetype.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper variant="cream">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 36 }}>
        {stage === 'silence' && null /* literally nothing on screen for 8s */}

        {stage === 'arrival' && (
          <p style={textStyle(22)}>the room is yours.</p>
        )}

        {stage === 'grounding' && (
          <p style={textStyle(17)}>
            feel the weight of the headphones.
            <br />notice your breathing.
            <br />look around the room.
          </p>
        )}

        {stage === 'normalize' && (
          <p style={textStyle(15, 0.85)}>
            whatever you experienced is a normal response to this kind of audio.
          </p>
        )}

        {stage === 'reflect' && (
          <>
            <p style={textStyle(15)}>{userName ? `${userName.toLowerCase()},` : ''} a word, if you want.</p>
            <input
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="kept here. nowhere else."
              style={{ width: '70%', maxWidth: 360, background: 'transparent', border: 'none', borderBottom: `0.5px solid ${COLORS.inkCreamSecondary}`, outline: 'none', padding: '8px 4px', fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 16, color: COLORS.inkCream, textAlign: 'center' }}
            />
            <button onClick={() => setStage('artifact')} style={btnStyle()}>CONTINUE</button>
          </>
        )}

        {stage === 'artifact' && selection && (
          <>
            <p style={textStyle(13, 0.8)}>your name for this hour</p>
            <h1 style={{ ...textStyle(28), margin: 0, fontWeight: 400 }}>{selection.archetype.name}</h1>
            <p style={{ ...textStyle(12, 0.7), margin: 0, fontFamily: FONTS.mono, letterSpacing: '0.2em' }}>{selection.variation.tag}</p>
            <button onClick={onTakeHome} style={btnStyle()}>TAKE THIS WITH YOU</button>
          </>
        )}
      </div>
    </Paper>
  );
}

function textStyle(size: number, opacity = 0.92): React.CSSProperties {
  return {
    fontFamily: FONTS.serif,
    fontStyle: 'italic',
    fontSize: size,
    color: COLORS.inkCream,
    textAlign: 'center',
    lineHeight: 1.5,
    opacity,
    maxWidth: 380,
    margin: 0,
    animation: 'sceneFade 1.4s ease-out',
  };
}

function btnStyle(): React.CSSProperties {
  return {
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: '0.2em',
    padding: '12px 22px',
    background: 'transparent',
    color: COLORS.inkCream,
    border: `0.6px solid ${COLORS.inkCream}`,
    borderRadius: 0,
    cursor: 'pointer',
  };
}
