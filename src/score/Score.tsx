import type { ReactNode } from 'react';
import { Paper } from './Paper';
import { Stave } from './Stave';
import { FONTS, inkFor, type PaperVariant } from './tokens';

export const VB_W = 360;
export const VB_H = 660;
export const MARGIN_X = 20;
const HEADER_Y = 30;
const DIVIDER_Y = 42;

export interface StaveSpec {
  y: number;
  x?: number;
  width?: number;
  opacity?: number;
}

interface ScoreProps {
  variant?: PaperVariant;
  pageTitle?: string;
  pageNumber?: string;
  voiceCue?: string;
  footer?: string;
  staves?: StaveSpec[];
  children?: ReactNode;
  /** Optional HTML overlay rendered above the SVG, useful for inputs and buttons */
  overlay?: ReactNode;
}

export function Score({
  variant = 'cream',
  pageTitle,
  pageNumber,
  voiceCue,
  footer,
  staves = [],
  children,
  overlay,
}: ScoreProps) {
  const { ink, secondary } = inkFor(variant);

  return (
    <Paper variant={variant}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {pageTitle && (
          <text
            x={MARGIN_X}
            y={HEADER_Y}
            fill={secondary}
            fontSize="11"
            fontFamily={FONTS.serif}
            fontStyle="italic"
          >
            {pageTitle}
          </text>
        )}
        {pageNumber && (
          <text
            x={VB_W - MARGIN_X}
            y={HEADER_Y}
            fill={secondary}
            fontSize="11"
            fontFamily={FONTS.mono}
            textAnchor="end"
          >
            {pageNumber}
          </text>
        )}
        <line
          x1={MARGIN_X}
          y1={DIVIDER_Y}
          x2={VB_W - MARGIN_X}
          y2={DIVIDER_Y}
          stroke={secondary}
          strokeWidth="0.5"
          opacity="0.5"
        />

        {staves.map((s, i) => (
          <Stave
            key={i}
            x={s.x ?? MARGIN_X}
            y={s.y}
            width={s.width ?? VB_W - MARGIN_X * 2}
            color={ink}
            opacity={s.opacity ?? 1}
          />
        ))}

        {children}

        {voiceCue && (
          <text
            x={VB_W / 2}
            y={VB_H - 50}
            fill={ink}
            fontSize="14"
            fontFamily={FONTS.serif}
            fontStyle="italic"
            textAnchor="middle"
          >
            {voiceCue}
          </text>
        )}

        {footer && (
          <text
            x={MARGIN_X}
            y={VB_H - 20}
            fill={secondary}
            fontSize="9"
            fontFamily={FONTS.mono}
          >
            {footer}
          </text>
        )}
      </svg>
      {overlay && <div className="overlay">{overlay}</div>}
    </Paper>
  );
}
