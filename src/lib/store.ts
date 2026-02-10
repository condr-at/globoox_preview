import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'ru';
export type LocalizedText = string | Partial<Record<Language, string>>;

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

export interface CustomChapter {
  number: number;
  title: LocalizedText;
  content: Record<Language, string>;
}

export interface CustomBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  languages: Language[];
  chapters: CustomChapter[];
  isCustom?: boolean;
}

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

  // Reading progress
  progress: ReadingProgress;
  updateProgress: (bookId: string, chapter: number, progress: number) => void;
  getProgress: (bookId: string) => { chapter: number; progress: number } | null;

  // Library state
  customBooks: CustomBook[];
  hiddenBookIds: string[];
  addCustomBook: (book: CustomBook) => void;
  hideBook: (bookId: string) => void;
  unhideBook: (bookId: string) => void;
  deleteBook: (bookId: string) => void;

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

      // Library state
      customBooks: [],
      hiddenBookIds: [],
      addCustomBook: (book) =>
        set((state) => ({
          customBooks: [book, ...state.customBooks.filter((b) => b.id !== book.id)],
          hiddenBookIds: state.hiddenBookIds.filter((id) => id !== book.id)
        })),
      hideBook: (bookId) =>
        set((state) => ({
          hiddenBookIds: state.hiddenBookIds.includes(bookId)
            ? state.hiddenBookIds
            : [...state.hiddenBookIds, bookId]
        })),
      unhideBook: (bookId) =>
        set((state) => ({
          hiddenBookIds: state.hiddenBookIds.filter((id) => id !== bookId)
        })),
      deleteBook: (bookId) =>
        set((state) => {
          const nextProgress = { ...state.progress };
          delete nextProgress[bookId];
          return {
            customBooks: state.customBooks.filter((b) => b.id !== bookId),
            hiddenBookIds: state.hiddenBookIds.filter((id) => id !== bookId),
            progress: nextProgress
          };
        }),

      // Translation state
      isTranslating: false,
      setIsTranslating: (value) => set({ isTranslating: value })
    }),
    {
      name: 'globoox-preview-storage'
    }
  )
);
