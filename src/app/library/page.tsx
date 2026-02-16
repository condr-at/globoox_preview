'use client';

import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import BookCard from '@/components/Store/BookCard';
import { useAppStore } from '@/lib/store';
import { useBooks } from '@/lib/useBooks';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';
const FALLBACK_AUTHOR = 'Unknown author';

export default function LibraryPage() {
  const { progress } = useAppStore();
  const { books, loading, error, hideBook, removeBook } = useBooks();

  const lastReadEntry = useMemo(
    () =>
      Object.entries(progress).sort(
        (a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime()
      )[0],
    [progress]
  );

  const lastBook = lastReadEntry ? books.find((b) => b.id === lastReadEntry[0]) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Library</h1>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {lastBook && lastReadEntry && (
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              Continue Reading
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <BookCard
                id={lastBook.id}
                title={lastBook.title}
                author={lastBook.author ?? FALLBACK_AUTHOR}
                cover={lastBook.cover_url ?? FALLBACK_COVER}
                progress={progress[lastBook.id]?.progress || 0}
                onHide={hideBook}
                onDelete={removeBook}
                hideLabel="Hide"
              />
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">All Books</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author ?? FALLBACK_AUTHOR}
                  cover={book.cover_url ?? FALLBACK_COVER}
                  progress={progress[book.id]?.progress || 0}
                  onHide={hideBook}
                  onDelete={removeBook}
                  hideLabel="Hide"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
