'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReaderView from '@/components/Reader/ReaderView';
import demoBooks from '@/data/demo-books.json';
import { useAppStore } from '@/lib/store';

export default function ReaderPage() {
  const params = useParams<{ id: string }>();
  const { customBooks } = useAppStore();

  const allBooks = [...customBooks, ...demoBooks.books];
  const book = allBooks.find((item) => item.id === params.id);

  if (!book) {
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

  return <ReaderView book={book as never} />;
}
