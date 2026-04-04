export type ReaderThemeId = 'light' | 'dark' | 'forest-light' | 'forest-dark';
export type ReaderFontWeight = 'light' | 'regular' | 'medium' | 'semibold';

export interface ReaderThemeConfig {
  id: ReaderThemeId;
  colors: {
    bg: string;
    text: string;
    accent: string;
  };
  typography: {
    h1Weight: ReaderFontWeight;
    h2Weight: ReaderFontWeight;
    h3Weight: ReaderFontWeight;
    h4Weight: ReaderFontWeight;
    bodyWeight: ReaderFontWeight;
    lineHeightScale: number;
  };
}

export const READER_THEME_CONFIGS: Record<ReaderThemeId, ReaderThemeConfig> = {
  light: {
    id: 'light',
    colors: { bg: '#F6F6FA', text: '#000000', accent: '#007AFF' },
    typography: {
      h1Weight: 'semibold',
      h2Weight: 'semibold',
      h3Weight: 'semibold',
      h4Weight: 'medium',
      bodyWeight: 'medium',
      lineHeightScale: 1,
    },
  },
  dark: {
    id: 'dark',
    colors: { bg: '#09090B', text: '#FFFFFF', accent: '#0A84FF' },
    typography: {
      h1Weight: 'medium',
      h2Weight: 'medium',
      h3Weight: 'medium',
      h4Weight: 'regular',
      bodyWeight: 'regular',
      lineHeightScale: 1,
    },
  },
  'forest-light': {
    id: 'forest-light',
    colors: { bg: '#F4F0E8', text: '#2C3B2D', accent: '#C05A3A' },
    typography: {
      h1Weight: 'semibold',
      h2Weight: 'medium',
      h3Weight: 'medium',
      h4Weight: 'regular',
      bodyWeight: 'medium',
      lineHeightScale: 1,
    },
  },
  'forest-dark': {
    id: 'forest-dark',
    colors: { bg: '#1A2419', text: '#F4F0E8', accent: '#E8B89A' },
    typography: {
      h1Weight: 'medium',
      h2Weight: 'medium',
      h3Weight: 'medium',
      h4Weight: 'regular',
      bodyWeight: 'regular',
      lineHeightScale: 1,
    },
  },
};

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
  const isDark = config.id.endsWith('dark');

  return {
    background: config.colors.bg,
    text: config.colors.text,
    accent: config.colors.accent,
    surface: withAlpha(config.colors.bg, isDark ? 0.9 : 0.92),
    border: withAlpha(config.colors.text, isDark ? 0.16 : 0.12),
    mutedText: withAlpha(config.colors.text, isDark ? 0.7 : 0.62),
    subtleText: withAlpha(config.colors.text, isDark ? 0.52 : 0.46),
    quoteText: withAlpha(config.colors.text, isDark ? 0.82 : 0.78),
  };
}
