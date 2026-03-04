'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ReaderView from '@/components/Reader/ReaderView';
import { ApiBook, fetchBook, getCachedBookById } from '@/lib/api';
import { getCachedBookMeta } from '@/lib/contentCache';
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
    // Mark book as "recently opened" immediately, so Library -> Continue Reading updates even if user doesn't turn a page.
    touchLastRead(id);

    // Try persisted IDB cache first (guest scope, then user scope if authenticated).
    let cancelled = false;
    const resolveFromIdb = async () => {
      const guest = await getCachedBookMeta('guest', id);
      if (!cancelled && guest) {
        setBook(guest);
        setLoading(false);
      }

      if (authLoading || !isAuthenticated || !user?.id) return;
      const authed = await getCachedBookMeta(user.id, id);
      if (!cancelled && authed) {
        setBook(authed);
        setLoading(false);
      }
    };
    void resolveFromIdb();

    // If we already have an in-memory cached book, the state initializer handled it.
    if (getCachedBookById(id)) {
      return () => { cancelled = true; };
    }

    // If we couldn't hydrate from memory, fall back to network.
    fetchBook(id)
      .then(setBook)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, touchLastRead, authLoading, isAuthenticated, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Book not found</p>
          <Link href="/library" className="text-[var(--system-blue)]">
            Back to Library
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
      availableLanguages={book.available_languages}
      originalLanguage={book.original_language}
      serverLanguage={book.selected_language}
      coverUrl={book.cover_url}
    />
  );
}
