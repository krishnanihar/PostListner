export const COLORS = {
  paperCream: '#F2EBD8',
  inkCream: '#1C1814',
  inkCreamSecondary: '#6B5840',
  paperDark: '#0B0908',
  inkDark: '#E8DFCB',
  inkDarkSecondary: '#8A7556',
  paperPureBlack: '#000000',
  scoreAmber: '#D4A053',
} as const;

export const FONTS = {
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
} as const;

export const STROKE = {
  staveLine: 0.4,
  primaryMark: 1.2,
  secondaryMark: 0.9,
  tactus: 1.0,
} as const;

export type PaperVariant = 'cream' | 'dark' | 'pure-black';

export function inkFor(variant: PaperVariant) {
  if (variant === 'cream') {
    return { ink: COLORS.inkCream, secondary: COLORS.inkCreamSecondary };
  }
  return { ink: COLORS.inkDark, secondary: COLORS.inkDarkSecondary };
}

export function paperFor(variant: PaperVariant) {
  if (variant === 'cream') return COLORS.paperCream;
  if (variant === 'pure-black') return COLORS.paperPureBlack;
  return COLORS.paperDark;
}
