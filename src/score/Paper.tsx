import type { ReactNode } from 'react';
import type { PaperVariant } from './tokens';
import { paperFor } from './tokens';

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface PaperProps {
  variant?: PaperVariant;
  children?: ReactNode;
}

export function Paper({ variant = 'cream', children }: PaperProps) {
  const isCream = variant === 'cream';
  const isPureBlack = variant === 'pure-black';
  const grainOpacity = isCream ? 0.06 : isPureBlack ? 0 : 0.03;

  return (
    <div
      data-paper={variant}
      style={{
        position: 'absolute',
        inset: 0,
        background: paperFor(variant),
        overflow: 'hidden',
      }}
    >
      {grainOpacity > 0 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAIN_URL,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
            opacity: grainOpacity,
            pointerEvents: 'none',
            mixBlendMode: isCream ? 'multiply' : 'screen',
          }}
        />
      )}
      {children}
    </div>
  );
}
