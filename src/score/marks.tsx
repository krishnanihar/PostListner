// 12 hand-set notation marks. Origin (0,0) is the mark's anchor on a stave line.

interface MarkBaseProps {
  size?: number;
  color?: string;
  opacity?: number;
}

export function Linea({
  size = 24,
  color = 'currentColor',
  opacity = 1,
  dip = 'left',
}: MarkBaseProps & { dip?: 'left' | 'right' }) {
  const path =
    dip === 'left'
      ? `M0 0 Q${size * 0.3} -${size * 0.25} ${size * 0.6} -${size * 0.1} Q${size * 0.85} ${size * 0.05} ${size} 0`
      : `M0 0 Q${size * 0.15} ${size * 0.05} ${size * 0.4} -${size * 0.1} Q${size * 0.7} -${size * 0.25} ${size} 0`;
  return (
    <g opacity={opacity}>
      <path
        d={path}
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function Vox({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  return (
    <g opacity={opacity}>
      {[0, 0.3, 0.6].map((d, i) => (
        <line
          key={i}
          x1={d * size}
          y1={0}
          x2={d * size}
          y2={size}
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function Pneuma({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  return (
    <g opacity={opacity}>
      <path
        d={`M0 0 Q${size * 0.4} -${size * 0.4} ${size * 0.6} 0 Q${size * 0.7} ${size * 0.4} ${size * 0.4} ${size * 0.4} Q-${size * 0.2} ${size * 0.5} -${size * 0.2} -${size * 0.1}`}
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function Ponticello({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  const r = size * 0.25;
  const halo = size * 0.55;
  return (
    <g opacity={opacity}>
      <path d={`M0 -${r} L${r} 0 L0 ${r} L-${r} 0 Z`} fill={color} />
      <circle
        cx="0"
        cy="0"
        r={halo}
        stroke={color}
        strokeWidth="0.5"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function Legno({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  const w = size * 0.5;
  const h = size * 0.5;
  return (
    <g opacity={opacity}>
      <path
        d={`M-${w} ${h} L${w} ${h} L0 -${h} Z`}
        stroke={color}
        strokeWidth="0.9"
        fill="none"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function Tremolo({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  return (
    <g opacity={opacity}>
      <line x1="0" y1="-3" x2={size * 0.5} y2="-1" stroke={color} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="0" x2={size * 0.5} y2="2" stroke={color} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="3" x2={size * 0.5} y2="5" stroke={color} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function Tactus({
  width = 100,
  color = 'currentColor',
  opacity = 1,
  amplitude = 6,
  frequency = 5,
}: {
  width?: number;
  color?: string;
  opacity?: number;
  amplitude?: number;
  frequency?: number;
}) {
  const segments = 30;
  let d = `M0 0`;
  for (let i = 1; i <= segments; i++) {
    const x = (i / segments) * width;
    const y = Math.sin((i / segments) * Math.PI * frequency) * amplitude;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return (
    <g opacity={opacity}>
      <path d={d} stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function Downbeat({ size = 4, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  return (
    <g opacity={opacity}>
      <circle cx="0" cy="0" r={size / 2} fill={color} />
    </g>
  );
}

export function Caesura({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  return (
    <g opacity={opacity}>
      <line x1="0" y1={-size * 0.4} x2={size * 0.25} y2={size * 0.4} stroke={color} strokeWidth="0.9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1={size * 0.4} y1={-size * 0.4} x2={size * 0.65} y2={size * 0.4} stroke={color} strokeWidth="0.9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function Volta({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  const r1 = size * 0.4;
  const r2 = size * 0.2;
  return (
    <g opacity={opacity}>
      <path d={`M-${r1} 0 A${r1} ${r1} 0 0 1 ${r1} 0`} stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={`M${r2} 0 A${r2} ${r2} 0 0 0 -${r2} 0`} stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function Marcato({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  const w = size * 0.4;
  const h = size * 0.5;
  return (
    <g opacity={opacity}>
      <line x1={-w} y1={h} x2="0" y2={-h} stroke={color} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={-h} x2={w} y2={h} stroke={color} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function Fermata({ size = 12, color = 'currentColor', opacity = 1 }: MarkBaseProps) {
  const w = size * 0.5;
  const h = size * 0.4;
  return (
    <g opacity={opacity}>
      <path d={`M-${w} ${h} Q0 -${h} ${w} ${h}`} stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx="0" cy={h * 0.3} r="1" fill={color} />
    </g>
  );
}
