'use client';

import { BookOpen } from 'lucide-react';
import BookCard from '@/components/Store/BookCard';
import { useAppStore } from '@/lib/store';
import demoBooks from '@/data/demo-books.json';

export default function LibraryPage() {
    const { progress } = useAppStore();

    // Find the last read book
    const lastReadBook = Object.entries(progress)
        .sort((a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime())
        [0];

    const lastBook = lastReadBook
        ? demoBooks.books.find(b => b.id === lastReadBook[0])
        : null;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
                <div className="container max-w-2xl mx-auto px-4 sm:px-6">
                    <h1 className="text-2xl font-bold py-4">Library</h1>
                </div>
            </header>

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
                {/* Continue Reading Section */}
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
                            />
                        </div>
                    </section>
                )}

                {/* All Books Section */}
                <section>
                    <h2 className="text-lg font-semibold mb-4">All Books</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {demoBooks.books.map((book) => (
                            <BookCard
                                key={book.id}
                                id={book.id}
                                title={book.title}
                                author={book.author}
                                cover={book.cover}
                                progress={progress[book.id]?.progress || 0}
                            />
                        ))}
                    </div>
                </section>

                {/* Tip */}
                <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-medium">Tip:</span> Switch languages while reading to see instant translations.
                </p>
            </div>
        </div>
    );
}
