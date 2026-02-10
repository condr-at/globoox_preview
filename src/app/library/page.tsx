'use client';

<<<<<<< Updated upstream
import { FormEvent, useMemo, useState } from 'react';
import { BookOpen, Plus, Loader2, X } from 'lucide-react';
import BookCard from '@/components/Store/BookCard';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useBooks } from '@/lib/useBooks';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';

export default function LibraryPage() {
  const { books, loading, error, addBook, hideBook, removeBook } = useBooks();
  const { progress } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lastReadBook = useMemo(() => {
    const entries = Object.entries(progress)
      .filter(([id]) => books.some((b) => b.id === id))
      .sort((a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime());
    if (entries.length === 0) return null;
    const [bookId] = entries[0];
    return books.find((b) => b.id === bookId) || null;
  }, [progress, books]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
=======
import { ChangeEvent, useMemo, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import BookCard from '@/components/Store/BookCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { CustomBook, Language, useAppStore } from '@/lib/store';
import demoBooks from '@/data/demo-books.json';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';
const FALLBACK_AUTHOR = 'Unknown author';
const MIN_UPLOAD_PREVIEW_MS = 700;
type ImportedBook = {
  title?: string;
  author?: string;
  cover?: string;
  language?: string;
  text?: string;
  chapters?: Array<{ title?: string; content?: string | Record<string, string> }>;
};

type UploadingPreview = {
  id: string;
  title: string;
  author: string;
};

const parseTextToBook = (text: string, fileName: string): CustomBook => {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const title = baseName || 'Uploaded Book';

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    author: FALLBACK_AUTHOR,
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
    author: data.author || FALLBACK_AUTHOR,
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
  const [filterMode, setFilterMode] = useState<'all' | 'visible' | 'hidden'>('visible');
  const [uploadingPreview, setUploadingPreview] = useState<UploadingPreview | null>(null);
  const { progress, customBooks, hiddenBookIds, addCustomBook, hideBook, unhideBook, deleteBook } = useAppStore();
  const customBookIds = useMemo(() => new Set(customBooks.map((book) => book.id)), [customBooks]);
  const allBooks = useMemo(() => [...customBooks, ...demoBooks.books], [customBooks]);
  const hiddenBookIdSet = useMemo(() => new Set(hiddenBookIds), [hiddenBookIds]);

  const visibleBooks = useMemo(
    () => allBooks.filter((book) => !hiddenBookIds.includes(book.id)),
    [allBooks, hiddenBookIds]
  );
  const hiddenBooks = useMemo(
    () => allBooks.filter((book) => hiddenBookIds.includes(book.id)),
    [allBooks, hiddenBookIds]
  );
  const filteredBooks = useMemo(() => {
    if (filterMode === 'all') {
      return allBooks;
    }
    if (filterMode === 'visible') {
      return visibleBooks;
    }
    return hiddenBooks;
  }, [allBooks, filterMode, hiddenBooks, visibleBooks]);

  const lastReadBook = Object.entries(progress)
    .sort((a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime())[0];

  const lastBook = lastReadBook
    ? visibleBooks.find((b) => b.id === lastReadBook[0])
    : null;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewStartedAt = Date.now();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setUploadingPreview({
      id: `uploading-${Date.now()}`,
      title: baseName || 'Uploaded Book',
      author: FALLBACK_AUTHOR
    });

>>>>>>> Stashed changes
    try {
      await addBook({ title: formTitle.trim(), author: formAuthor.trim() || undefined });
      setFormTitle('');
      setFormAuthor('');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to add book', err);
    } finally {
<<<<<<< Updated upstream
      setSubmitting(false);
=======
      const elapsed = Date.now() - previewStartedAt;
      if (elapsed < MIN_UPLOAD_PREVIEW_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_UPLOAD_PREVIEW_MS - elapsed));
      }
      setUploadingPreview(null);
      event.target.value = '';
>>>>>>> Stashed changes
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      await removeBook(bookId);
    } catch (err) {
      console.error('Failed to delete book', err);
    }
  };

  const handleHide = async (bookId: string) => {
    try {
      await hideBook(bookId);
    } catch (err) {
      console.error('Failed to hide book', err);
    }
  };

  const showUploadingCard = Boolean(uploadingPreview) && filterMode !== 'hidden';
  const hasBooksInGrid = filteredBooks.length > 0 || showUploadingCard;

  return (
    <div className="min-h-screen bg-background">
      <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Library</h1>
<<<<<<< Updated upstream
          <Button
            size="sm"
            className="h-8 rounded-full bg-[var(--system-blue)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--system-blue)]/90"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add book'}
          </Button>
=======
          <>
            <input
              id="book-upload-input"
              type="file"
              accept=".txt,.md,.json"
              className="sr-only"
              onChange={handleUpload}
            />
            <Button
              asChild
              size="sm"
              className="rounded-[var(--radius-pill)] px-4"
            >
              <label htmlFor="book-upload-input">Add book</label>
            </Button>
          </>
>>>>>>> Stashed changes
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
<<<<<<< Updated upstream
        {showForm && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-lg border bg-card">
            <input
              type="text"
              placeholder="Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
              autoFocus
              required
            />
            <input
              type="text"
              placeholder="Author (optional)"
              value={formAuthor}
              onChange={(e) => setFormAuthor(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            />
            <Button type="submit" size="sm" disabled={submitting || !formTitle.trim()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add
            </Button>
          </form>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Failed to load books: {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] rounded-md bg-muted mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {lastReadBook && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Continue Reading
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <BookCard
                    id={lastReadBook.id}
                    title={lastReadBook.title}
                    author={lastReadBook.author || 'Unknown'}
                    cover={lastReadBook.cover_url || FALLBACK_COVER}
                    progress={progress[lastReadBook.id]?.progress || 0}
                    onHide={handleHide}
                    onDelete={handleDelete}
                  />
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold mb-4">All Books</h2>
              {books.length === 0 ? (
                <p className="text-sm text-muted-foreground">No books yet. Add one to get started.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {books.map((book) => (
                    <BookCard
                      key={book.id}
                      id={book.id}
                      title={book.title}
                      author={book.author || 'Unknown'}
                      cover={book.cover_url || FALLBACK_COVER}
                      progress={progress[book.id]?.progress || 0}
                      onHide={handleHide}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
=======
        <section>
          <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'visible' ? 'secondary' : 'ghost'}
              onClick={() => setFilterMode('visible')}
            >
              Visible
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'hidden' ? 'secondary' : 'ghost'}
              onClick={() => setFilterMode('hidden')}
            >
              Hidden
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === 'all' ? 'secondary' : 'ghost'}
              onClick={() => setFilterMode('all')}
            >
              All
            </Button>
          </div>
        </section>

        {filterMode === 'visible' && lastBook && lastReadBook && (
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
                hideLabel="Hide"
              />
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">
            {filterMode === 'all' ? 'All Books' : filterMode === 'hidden' ? 'Hidden Books' : 'Visible Books'}
          </h2>
          {!hasBooksInGrid ? (
            <p className="text-sm text-muted-foreground">
              {filterMode === 'all'
                ? 'No books yet.'
                : filterMode === 'hidden'
                  ? 'No hidden books yet.'
                  : 'No visible books yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {showUploadingCard && uploadingPreview && (
                <Card key={uploadingPreview.id} className="w-full opacity-90 pointer-events-none">
                  <CardContent className="p-3">
                    <div className="aspect-[2/3] rounded-md bg-muted mb-2 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    </div>
                    <CardTitle className="text-sm mb-1 line-clamp-2">{uploadingPreview.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {uploadingPreview.author}
                    </CardDescription>
                  </CardContent>
                </Card>
              )}
              {filteredBooks.map((book) => {
                const isHidden = hiddenBookIdSet.has(book.id);
                return (
                  <BookCard
                    key={book.id}
                    id={book.id}
                    title={book.title}
                    author={book.author}
                    cover={book.cover}
                    progress={progress[book.id]?.progress || 0}
                    onHide={isHidden ? unhideBook : hideBook}
                    onDelete={handleDelete}
                    hideLabel={isHidden ? 'Unhide' : 'Hide'}
                  />
                );
              })}
            </div>
          )}
        </section>
>>>>>>> Stashed changes

        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">Tip:</span> Add books and switch languages while reading.
        </p>
      </div>
    </div>
  );
}
