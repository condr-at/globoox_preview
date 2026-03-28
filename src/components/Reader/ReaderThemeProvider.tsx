'use client';

import { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import { ReaderThemeContext } from '@/lib/hooks/useReaderTheme';
import { READER_THEME_CONFIGS } from '@/lib/readerTheme';

export function ReaderThemeProvider({ children }: { children: ReactNode }) {
  const readerThemeId = useAppStore((state) => state.settings.readerTheme);
  const config = READER_THEME_CONFIGS[readerThemeId];

  if (!config) {
    console.warn(`Unknown reader theme: ${readerThemeId}, falling back to light`);
  }

  return (
    <ReaderThemeContext.Provider value={config || READER_THEME_CONFIGS['light']}>
      {children}
    </ReaderThemeContext.Provider>
  );
}
