'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ReaderView from '@/components/Reader/ReaderView';
import { ApiBook, fetchBook, getCachedBookById } from '@/lib/api';
import { getCachedBookMeta, touchCachedLastRead } from '@/lib/contentCache';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppStore } from '@/lib/store';

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { id } = use(params);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const touchLastRead = useAppStore((s) => s.touchLastRead);
  const [book, setBook] = useState<ApiBook | null>(() => getCachedBookById(id) ?? null);
  const [loading, setLoading] = useState(() => !getCachedBookById(id));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Mark book as "recently opened" immediately, so Library sort by "recently opened" updates even if user doesn't turn a page.
    touchLastRead(id);
    const scopeKey = isAuthenticated && user?.id ? user.id : 'guest';
    void touchCachedLastRead(scopeKey, id, new Date().toISOString());

    let cancelled = false;
    const cachedBook = getCachedBookById(id);
    if (cachedBook) {
      setBook(cachedBook);
      setLoading(false);
      setNotFound(false);
      return () => {
        cancelled = true;
      };
    }

    const loadBook = async () => {
      try {
        const guest = await getCachedBookMeta('guest', id);
        if (cancelled) return;
        if (guest) {
          setBook(guest);
          setLoading(false);
          setNotFound(false);
          return;
        }

        if (!authLoading && isAuthenticated && user?.id) {
          const authed = await getCachedBookMeta(user.id, id);
          if (cancelled) return;
          if (authed) {
            setBook(authed);
            setLoading(false);
            setNotFound(false);
            return;
          }
        }

        const fetched = await fetchBook(id);
        if (cancelled) return;
        setBook(fetched);
        setNotFound(false);
      } catch {
        if (cancelled) return;
        setNotFound(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBook();

    return () => {
      cancelled = true;
    };
  }, [id, touchLastRead, authLoading, isAuthenticated, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full bg-muted animate-pulse" />
          <p className="text-lg font-semibold">Loading your book...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Downloading the file and checking compatibility.
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Book not found</p>
          <Link href="/my-books" className="text-primary">
            Back to My Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReaderView
      key={book.id}
      bookId={book.id}
      title={book.title}
      author={book.author}
      availableLanguages={book.available_languages}
      originalLanguage={book.original_language}
      serverLanguage={book.selected_language}
      coverUrl={book.cover_url}
      isOwn={book.is_own ?? false}
    />
  );
}
