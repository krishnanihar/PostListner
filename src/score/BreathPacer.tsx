interface BreathPacerProps {
  /** breaths per minute, default 5.5 (resonance frequency, Lehrer & Gevirtz 2014) */
  bpm?: number;
  size?: number;
  color?: string;
  opacity?: number;
}

/**
 * A single fermata that opens (inhale) and closes (exhale) at a slow pace.
 * Renders as SVG so it composes inside a Score viewBox at any scale.
 *
 * One full cycle = (60 / bpm) seconds. Default 5.5 bpm → 10.9s/cycle.
 */
export function BreathPacer({
  bpm = 5.5,
  size = 60,
  color = 'currentColor',
  opacity = 0.85,
}: BreathPacerProps) {
  const cycle = 60 / bpm;
  return (
    <g opacity={opacity}>
      <g style={{ animation: `pacerSwell ${cycle}s ease-in-out infinite`, transformOrigin: 'center' }}>
        <path
          d={`M-${size * 0.5} ${size * 0.3} Q0 -${size * 0.4} ${size * 0.5} ${size * 0.3}`}
          stroke={color}
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="0" cy={size * 0.1} r="1.4" fill={color} />
      </g>
      <style>{`
        @keyframes pacerSwell {
          0%, 100% { transform: scale(0.85); opacity: 0.55; }
          50% { transform: scale(1.18); opacity: 1; }
        }
      `}</style>
    </g>
  );
}
