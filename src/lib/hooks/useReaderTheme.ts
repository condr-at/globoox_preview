'use client';

import { createContext, useContext } from 'react';
import type { ReaderThemeConfig } from '@/lib/readerTheme';

const ReaderThemeContext = createContext<ReaderThemeConfig | null>(null);

export function useReaderTheme(): ReaderThemeConfig {
  const context = useContext(ReaderThemeContext);
  if (!context) {
    throw new Error('useReaderTheme must be used within ReaderThemeProvider');
  }
  return context;
}

export { ReaderThemeContext };
