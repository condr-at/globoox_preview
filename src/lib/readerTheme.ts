import { THEME_DEFINITIONS } from '@/lib/themes';
import type { ReaderFontWeight } from '@/lib/themes';

export type {
  ReaderThemeId,
} from '@/lib/themes';

export type ReaderThemeConfig = (typeof THEME_DEFINITIONS)[keyof typeof THEME_DEFINITIONS];

export const READER_THEME_CONFIGS = THEME_DEFINITIONS;

export interface ReaderSemanticTokens {
  background: string;
  panelBackground: string;
  chromeBackground: string;
  text: string;
  mutedText: string;
  subtleText: string;
  accent: string;
  border: string;
  danger: string;
}

export interface ReaderContentTokens {
  quoteText: string;
  quoteBorder: string;
  captionText: string;
  skeletonFill: string;
  pendingLabelText: string;
}

export interface ReaderPreviewTokens {
  swatchBackground: string;
  swatchAccent: string;
  swatchText: string;
  activeRing: string;
  activeCheckBackground: string;
  activeCheckForeground: string;
}

export function getReaderWeightClass(weight: ReaderFontWeight): string {
  const weightClasses: Record<ReaderFontWeight, string> = {
    light: 'font-light',
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
  };
  return weightClasses[weight];
}

export function getReaderHeadingTypography(level: number, config: ReaderThemeConfig): {
  className: string;
  sizeScale: number;
  italic: boolean;
} {
  const weightMap = {
    1: config.typography.h1Weight,
    2: config.typography.h2Weight,
    3: config.typography.h3Weight,
    4: config.typography.h4Weight,
    5: config.typography.h4Weight,
    6: config.typography.h4Weight,
  } as const;
  const weight = weightMap[level as keyof typeof weightMap] ?? config.typography.bodyWeight;
  const weightClass = getReaderWeightClass(weight);
  const sizeScale = level === 1 ? 1.6 : level === 2 ? 1.35 : 1.18;

  return {
    className: `${weightClass} ${level === 1 ? 'mb-3 mt-6' : level === 2 ? 'mb-2 mt-5' : 'mb-2 mt-4'}`,
    sizeScale,
    italic: level > 4,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const value = Number.parseInt(expanded, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getReaderUiColors(config: ReaderThemeConfig) {
  const semantic = getReaderSemanticTokens(config);
  const content = getReaderContentTokens(config);

  return {
    background: semantic.background,
    text: semantic.text,
    accent: semantic.accent,
    surface: semantic.chromeBackground,
    panelSurface: semantic.panelBackground,
    border: semantic.border,
    mutedText: semantic.mutedText,
    subtleText: semantic.subtleText,
    quoteText: content.quoteText,
  };
}

export function getReaderSemanticTokens(config: ReaderThemeConfig): ReaderSemanticTokens {
  const isDark = config.id.endsWith('dark');

  return {
    background: config.colors.bg,
    panelBackground: config.colors.bg,
    chromeBackground: withAlpha(config.colors.bg, isDark ? 0.9 : 0.92),
    text: config.colors.text,
    mutedText: withAlpha(config.colors.text, isDark ? 0.7 : 0.62),
    subtleText: withAlpha(config.colors.text, isDark ? 0.52 : 0.46),
    accent: config.colors.accent,
    border: withAlpha(config.colors.text, isDark ? 0.16 : 0.12),
    danger: '#dc2626',
  };
}

export function getReaderContentTokens(config: ReaderThemeConfig): ReaderContentTokens {
  const semantic = getReaderSemanticTokens(config);

  return {
    quoteText: withAlpha(config.colors.text, config.id.endsWith('dark') ? 0.82 : 0.78),
    quoteBorder: semantic.accent,
    captionText: semantic.mutedText,
    skeletonFill: semantic.border,
    pendingLabelText: semantic.mutedText,
  };
}

export function getReaderPreviewTokens(config: ReaderThemeConfig): ReaderPreviewTokens {
  return {
    swatchBackground: config.colors.bg,
    swatchAccent: config.colors.accent,
    swatchText: config.colors.text,
    activeRing: config.colors.accent,
    activeCheckBackground: config.colors.accent,
    activeCheckForeground: config.colors.bg,
  };
}
