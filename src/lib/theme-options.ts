import type { AppPalette } from '@/lib/hooks/useAppTheme';

export const APP_THEME_MODE_OPTIONS = [
  { id: 'system', label: 'System Default' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const;

export const APP_THEME_PALETTE_OPTIONS: ReadonlyArray<{
  id: AppPalette;
  label: string;
  lightTheme: 'light' | 'forest-light';
  darkTheme: 'dark' | 'forest-dark';
}> = [
  { id: 'globoox', label: 'Globoox', lightTheme: 'forest-light', darkTheme: 'forest-dark' },
  { id: 'default', label: 'Neutral', lightTheme: 'light', darkTheme: 'dark' },
] as const;
