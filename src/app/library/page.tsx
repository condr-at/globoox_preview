'use client';

import { ChangeEvent, useMemo, useRef } from 'react';
import { BookOpen, Upload } from 'lucide-react';
import BookCard from '@/components/Store/BookCard';
import { Button } from '@/components/ui/button';
import { CustomBook, Language, useAppStore } from '@/lib/store';
import demoBooks from '@/data/demo-books.json';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';

type ImportedBook = {
  title?: string;
  author?: string;
  cover?: string;
  language?: string;
  text?: string;
  chapters?: Array<{ title?: string; content?: string | Record<string, string> }>;
};

const parseTextToBook = (text: string, fileName: string): CustomBook => {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const title = baseName || 'Uploaded Book';

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    author: 'Uploaded file',
    cover: FALLBACK_COVER,
    languages: ['en'],
    chapters: [
      {
        number: 1,
        title: 'Chapter 1',
        content: {
          en: text || 'Empty file.',
          fr: text || 'Empty file.',
          es: text || 'Empty file.',
          de: text || 'Empty file.',
          ru: text || 'Empty file.'
        }
      }
    ],
    isCustom: true
  };
};

const parseJsonToBook = (raw: string, fileName: string): CustomBook => {
  const data = JSON.parse(raw) as ImportedBook;
  const fallback = parseTextToBook(data.text || '', fileName);

  const language = (data.language || 'en') as Language;
  const supportedLanguages: Language[] = ['en', 'fr', 'es', 'de', 'ru'];
  const normalizedLanguage = supportedLanguages.includes(language) ? language : 'en';

  const chapters = (data.chapters || []).map((chapter, index) => {
    const contentByLanguage: Record<Language, string> = {
      en: '',
      fr: '',
      es: '',
      de: '',
      ru: ''
    };

    if (typeof chapter.content === 'string') {
      contentByLanguage[normalizedLanguage] = chapter.content;
      if (!contentByLanguage.en) {
        contentByLanguage.en = chapter.content;
      }
    }

    if (chapter.content && typeof chapter.content === 'object') {
      for (const [langKey, value] of Object.entries(chapter.content)) {
        if (supportedLanguages.includes(langKey as Language) && typeof value === 'string') {
          contentByLanguage[langKey as Language] = value;
        }
      }
      if (!contentByLanguage.en) {
        contentByLanguage.en = Object.values(contentByLanguage).find(Boolean) || '';
      }
    }

    return {
      number: index + 1,
      title: chapter.title || `Chapter ${index + 1}`,
      content: contentByLanguage
    };
  });

  return {
    ...fallback,
    title: data.title || fallback.title,
    author: data.author || 'Uploaded file',
    cover: data.cover || FALLBACK_COVER,
    languages: (() => {
      const parsedLanguages = Array.from(new Set(chapters.flatMap((chapter) =>
        Object.entries(chapter.content)
          .filter(([, value]) => Boolean(value))
          .map(([lang]) => lang as Language)
      )));
      return parsedLanguages.length > 0 ? parsedLanguages : ['en'];
    })(),
    chapters: chapters.length > 0 ? chapters : fallback.chapters,
  };
};

export default function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { progress, customBooks, hiddenBookIds, addCustomBook, hideBook, deleteBook } = useAppStore();
  const customBookIds = useMemo(() => new Set(customBooks.map((book) => book.id)), [customBooks]);

  const visibleBooks = useMemo(
    () => [...customBooks, ...demoBooks.books].filter((book) => !hiddenBookIds.includes(book.id)),
    [customBooks, hiddenBookIds]
  );

  const lastReadBook = Object.entries(progress)
    .sort((a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime())[0];

  const lastBook = lastReadBook
    ? visibleBooks.find((b) => b.id === lastReadBook[0])
    : null;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const extension = file.name.split('.').pop()?.toLowerCase();

      const book = extension === 'json'
        ? parseJsonToBook(content, file.name)
        : parseTextToBook(content, file.name);

      addCustomBook(book);
    } catch (error) {
      console.error('Failed to upload book', error);
      alert('Could not import this file. Use TXT, MD, or JSON.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = (bookId: string) => {
    if (customBookIds.has(bookId)) {
      deleteBook(bookId);
      return;
    }

    hideBook(bookId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Library</h1>
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              className="h-8 rounded-full bg-[var(--system-blue)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--system-blue)]/90"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Add book
            </Button>
          </>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
        {lastBook && lastReadBook && (
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              Continue Reading
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <BookCard
                id={lastBook.id}
                title={lastBook.title}
                author={lastBook.author}
                cover={lastBook.cover}
                progress={progress[lastBook.id]?.progress || 0}
                onHide={hideBook}
                onDelete={handleDelete}
              />
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">All Books</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                cover={book.cover}
                progress={progress[book.id]?.progress || 0}
                onHide={hideBook}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">Tip:</span> Upload TXT/MD/JSON books and switch languages while reading.
        </p>
      </div>
    </div>
  );
}
