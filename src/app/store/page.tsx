'use client';

import { useState, useMemo } from 'react';
import { StoreBookCard } from '@/components/Store/BookCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import amazonBooks from '@/data/amazon-books.json';

const genres = ['All', 'Fiction', 'Non-Fiction', 'Classics', 'Self-Help', 'Science Fiction', 'Romance', 'Thriller'];

export default function StorePage() {
    const [search, setSearch] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('All');

    const filteredBooks = useMemo(() => {
        return amazonBooks.books.filter((book) => {
            const matchesSearch =
                book.title.toLowerCase().includes(search.toLowerCase()) ||
                book.author.toLowerCase().includes(search.toLowerCase());

            const matchesGenre =
                selectedGenre === 'All' ||
                book.genre.some(g => g.toLowerCase() === selectedGenre.toLowerCase());

            return matchesSearch && matchesGenre;
        });
    }, [search, selectedGenre]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b">
                <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">
                    <h1 className="text-2xl font-bold">Store</h1>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search books..."
                            className="pl-10 pr-10"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Genre filters */}
                    <div className="flex gap-2 overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:-mx-6 sm:px-6">
                        {genres.map((genre) => (
                            <Button
                                key={genre}
                                variant={selectedGenre === genre ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedGenre(genre)}
                                className="rounded-full flex-shrink-0"
                            >
                                {genre}
                            </Button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-4">
                {/* Results count */}
                <p className="text-sm text-muted-foreground mb-4">
                    {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found
                </p>

                {/* Books grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredBooks.map((book) => (
                        <StoreBookCard
                            key={book.id}
                            id={book.id}
                            title={book.title}
                            author={book.author}
                            cover={book.cover}
                            rating={book.rating}
                            reviews={book.reviews}
                            price={book.price}
                            hasDemo={book.hasDemo}
                            demoBookId={book.demoBookId}
                        />
                    ))}
                </div>

                {/* Empty state */}
                {filteredBooks.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-base text-muted-foreground mb-2">
                            No books found
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Try adjusting your search or filters
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
