'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppPalette = 'globoox' | 'default';
export type AppMode = 'light' | 'dark' | 'system';
export type AppThemeClass = 'light' | 'dark' | 'forest-light' | 'forest-dark';

const THEME_CLASSES: AppThemeClass[] = ['light', 'dark', 'forest-light', 'forest-dark'];
const APP_THEME_STORAGE_KEY = 'globoox-app-theme';
const LEGACY_MODE_KEY = 'globoox-mode';
const LEGACY_PALETTE_KEY = 'globoox-palette';

function isMode(value: unknown): value is AppMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isPalette(value: unknown): value is AppPalette {
  return value === 'globoox' || value === 'default';
}

function readStoredTheme(): { mode: AppMode; palette: AppPalette } {
  if (typeof window === 'undefined') return { mode: 'dark', palette: 'globoox' };

  try {
    const raw = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { mode?: unknown; palette?: unknown } };
      const mode = parsed?.state?.mode;
      const palette = parsed?.state?.palette;
      if (isMode(mode) && isPalette(palette)) {
        return { mode, palette };
      }
    }
  } catch {
    // Ignore malformed storage and continue with legacy fallback.
  }

  try {
    const legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
    const legacyPalette = localStorage.getItem(LEGACY_PALETTE_KEY);
    return {
      mode: isMode(legacyMode) ? legacyMode : 'dark',
      palette: isPalette(legacyPalette) ? legacyPalette : 'globoox',
    };
  } catch {
    return { mode: 'dark', palette: 'globoox' };
  }
}

function resolveClass(mode: AppMode, palette: AppPalette): AppThemeClass {
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  return palette === 'globoox' ? (dark ? 'forest-dark' : 'forest-light') : (dark ? 'dark' : 'light');
}

function applyClass(cls: AppThemeClass) {
  const el = document.documentElement;
  el.classList.remove(...THEME_CLASSES);
  el.classList.add(cls);
}

type AppThemeState = {
  mode: AppMode;
  palette: AppPalette;
  setAppTheme: (mode: AppMode, palette: AppPalette) => void;
};

const useAppThemeStore = create<AppThemeState>()(
  persist(
    (set) => ({
      ...readStoredTheme(),
      setAppTheme: (mode, palette) => set({ mode, palette }),
    }),
    {
      name: APP_THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        palette: state.palette,
      }),
    },
  ),
);

export function useAppTheme() {
  const mode = useAppThemeStore((state) => state.mode);
  const palette = useAppThemeStore((state) => state.palette);
  const setThemeState = useAppThemeStore((state) => state.setAppTheme);

  useEffect(() => {
    applyClass(resolveClass(mode, palette));
  }, [mode, palette]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyClass(resolveClass('system', palette));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, palette]);

  const setAppTheme = (newMode: AppMode, newPalette: AppPalette) => {
    setThemeState(newMode, newPalette);
    applyClass(resolveClass(newMode, newPalette));
  };

  return {
    mode,
    palette,
    theme: resolveClass(mode, palette) as AppThemeClass,
    setAppTheme,
  };
}
