'use client';

import { useCallback, useEffect, useState } from 'react';

export type AppPalette = 'globoox' | 'default';
export type AppMode = 'light' | 'dark' | 'system';
export type AppThemeClass = 'light' | 'dark' | 'forest-light' | 'forest-dark';

const THEME_CLASSES: AppThemeClass[] = ['light', 'dark', 'forest-light', 'forest-dark'];
const PALETTE_KEY = 'globoox-palette';
const MODE_KEY = 'globoox-mode';

function resolveClass(mode: AppMode, palette: AppPalette): AppThemeClass {
  const dark = mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return palette === 'globoox'
    ? (dark ? 'forest-dark' : 'forest-light')
    : (dark ? 'dark' : 'light');
}

function applyClass(cls: AppThemeClass) {
  const el = document.documentElement;
  el.classList.remove(...THEME_CLASSES);
  el.classList.add(cls);
}

function readStored(): { mode: AppMode; palette: AppPalette } {
  try {
    return {
      mode: (localStorage.getItem(MODE_KEY) as AppMode) || 'system',
      palette: (localStorage.getItem(PALETTE_KEY) as AppPalette) || 'globoox',
    };
  } catch {
    return { mode: 'system', palette: 'globoox' };
  }
}

export function useAppTheme() {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'system';
    return readStored().mode;
  });
  const [palette, setPaletteState] = useState<AppPalette>(() => {
    if (typeof window === 'undefined') return 'globoox';
    return readStored().palette;
  });

  // Apply on mount and when mode/palette change
  useEffect(() => {
    applyClass(resolveClass(mode, palette));
  }, [mode, palette]);

  // Listen for system theme changes when mode === 'system'
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyClass(resolveClass('system', palette));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, palette]);

  const setAppTheme = useCallback((newMode: AppMode, newPalette: AppPalette) => {
    localStorage.setItem(MODE_KEY, newMode);
    localStorage.setItem(PALETTE_KEY, newPalette);
    setModeState(newMode);
    setPaletteState(newPalette);
    applyClass(resolveClass(newMode, newPalette));
  }, []);

  // Current resolved theme class (for ReaderSettings compatibility)
  const theme: AppThemeClass = resolveClass(mode, palette);

  return { mode, palette, theme, setAppTheme };
}
