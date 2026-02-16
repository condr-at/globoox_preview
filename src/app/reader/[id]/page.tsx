'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ReaderView from '@/components/Reader/ReaderView';
import { ApiBook, fetchBook } from '@/lib/api';

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { id } = use(params);
  const [book, setBook] = useState<ApiBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchBook(id)
      .then(setBook)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

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
      bookId={book.id}
      title={book.title}
      availableLanguages={book.available_languages}
    />
  );
}
