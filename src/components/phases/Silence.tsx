'use client';

/**
 * Threshold of Silence — the room is yours. Cream paper, no marks, one
 * italic line, one optional reflection field that goes nowhere by design.
 */

import { useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';

export function Silence() {
  const [reflection, setReflection] = useState('');

  return (
    <Paper variant="cream">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 80,
        }}
      >
        <p
          style={{
            fontFamily: FONTS.serif,
            fontStyle: 'italic',
            fontSize: 22,
            color: COLORS.inkCream,
            textAlign: 'center',
            lineHeight: 1.4,
            opacity: 0.92,
            animation: 'sceneFade 1.4s ease-out',
          }}
        >
          the room is yours.
        </p>
        <div style={{ width: '70%', maxWidth: 360 }}>
          <input
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="(a word, if you want)"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: `0.5px solid ${COLORS.inkCreamSecondary}`,
              outline: 'none',
              padding: '8px 4px',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 16,
              color: COLORS.inkCream,
              textAlign: 'center',
            }}
          />
          <div
            style={{
              marginTop: 8,
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.18em',
              color: COLORS.inkCreamSecondary,
              textAlign: 'center',
              opacity: 0.6,
            }}
          >
            kept here. nowhere else.
          </div>
        </div>
      </div>
    </Paper>
  );
}
