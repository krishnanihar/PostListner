interface StaveProps {
  x?: number;
  y: number;
  width?: number;
  color?: string;
  opacity?: number;
  lineSpacing?: number;
  strokeWidth?: number;
  lines?: number;
}

export function Stave({
  x = 0,
  y,
  width = 320,
  color = 'currentColor',
  opacity = 1,
  lineSpacing = 4,
  strokeWidth = 0.4,
  lines = 4,
}: StaveProps) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: lines }, (_, i) => (
        <line
          key={i}
          x1={x}
          y1={y + i * lineSpacing}
          x2={x + width}
          y2={y + i * lineSpacing}
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
