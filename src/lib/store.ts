import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'ru';

export const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  ru: 'Русский'
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  ru: '🇷🇺'
};

interface ReaderSettings {
  fontSize: number;
  theme: 'dark' | 'light';
  language: Language;
}

interface ReadingProgress {
  [bookId: string]: {
    chapter: number;
    progress: number;
    lastRead: string;
  };
}

interface AppState {
  // Reader settings
  settings: ReaderSettings;
  setFontSize: (size: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (language: Language) => void;

  // Per-book language preferences
  perBookLanguages: Record<string, Language>;
  setBookLanguage: (bookId: string, lang: Language) => void;

  // Reading progress
  progress: ReadingProgress;
  updateProgress: (bookId: string, chapter: number, progress: number) => void;
  getProgress: (bookId: string) => { chapter: number; progress: number } | null;

  // Translation state
  isTranslating: boolean;
  setIsTranslating: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Default settings
      settings: {
        fontSize: 18,
        theme: 'dark',
        language: 'en'
      },

      setFontSize: (size) =>
        set((state) => ({
          settings: { ...state.settings, fontSize: size }
        })),

      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme }
        })),

      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language }
        })),

      // Per-book language preferences
      perBookLanguages: {},

      setBookLanguage: (bookId, lang) =>
        set((state) => ({
          perBookLanguages: { ...state.perBookLanguages, [bookId]: lang }
        })),

      // Reading progress
      progress: {},

      updateProgress: (bookId, chapter, progress) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [bookId]: {
              chapter,
              progress,
              lastRead: new Date().toISOString()
            }
          }
        })),

      getProgress: (bookId) => {
        const progress = get().progress[bookId];
        if (!progress) return null;
        return { chapter: progress.chapter, progress: progress.progress };
      },

      // Translation state
      isTranslating: false,
      setIsTranslating: (value) => set({ isTranslating: value })
    }),
    {
      name: 'globoox-preview-storage'
    }
  )
);
