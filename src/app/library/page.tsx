'use client';

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
    try {
      await addBook({ title: formTitle.trim(), author: formAuthor.trim() || undefined });
      setFormTitle('');
      setFormAuthor('');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to add book', err);
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Library</h1>
          <Button
            size="sm"
            className="h-8 rounded-full bg-[var(--system-blue)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--system-blue)]/90"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add book'}
          </Button>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
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

        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">Tip:</span> Add books and switch languages while reading.
        </p>
      </div>
    </div>
  );
}
