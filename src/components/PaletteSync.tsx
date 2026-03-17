'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function PaletteSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const mode = localStorage.getItem('globoox-mode') || 'system';
    if (mode !== 'system') return;

    const palette = localStorage.getItem('globoox-palette') || 'globoox';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (dark: boolean) => {
      setTheme(palette === 'globoox'
        ? (dark ? 'forest-dark' : 'forest-light')
        : (dark ? 'dark' : 'light')
      );
    };

    apply(mq.matches);
    mq.addEventListener('change', (e) => apply(e.matches));
    return () => mq.removeEventListener('change', (e) => apply(e.matches));
  }, [setTheme]);

  return null;
}
