'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Star, ExternalLink, BookOpen } from 'lucide-react';
import amazonBooks from '@/data/amazon-books.json';

interface BookDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BookDetailPage({ params }: BookDetailPageProps) {
    const { id } = use(params);
    const book = amazonBooks.books.find((b) => b.id === id);

    if (!book) {
        notFound();
    }

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(rating)
                    ? 'fill-[var(--system-orange)] text-[var(--system-orange)]'
                    : i < rating
                        ? 'fill-[var(--system-orange)]/50 text-[var(--system-orange)]'
                        : 'text-[var(--system-gray3)]'
                    }`}
            />
        ));
    };

    return (
        <div className="min-h-screen bg-[var(--bg-grouped)]">
            {/* Navigation Bar */}
            <header className="nav-bar sticky top-0 z-40 safe-area-inset-top">
                <div className="flex items-center h-[44px] px-[16px]">
                    <Link href="/store" className="flex items-center gap-[4px] text-[var(--system-blue)] -ml-[8px] min-w-[44px] min-h-[44px] pl-[8px]">
                        <ChevronLeft className="w-[20px] h-[20px]" strokeWidth={2.5} />
                        <span className="text-[17px]">Store</span>
                    </Link>
                </div>
            </header>

            <div className="px-[16px] pb-[32px]">
                {/* Cover */}
                <div className="relative mx-auto max-w-[200px] mb-[24px]">
                    <div className="relative aspect-[2/3] rounded-[12px] overflow-hidden shadow-lg">
                        <Image
                            src={book.cover}
                            alt={book.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>

                    {/* Demo badge */}
                    {book.hasDemo && (
                        <div className="absolute -top-[8px] -right-[8px] px-[12px] py-[4px] rounded-full bg-[var(--system-blue)] text-[12px] font-semibold text-white shadow-md">
                            Demo Available
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="bg-[var(--bg-grouped-secondary)] rounded-[12px] p-[16px] mb-[16px]">
                    <h1 className="text-[22px] font-bold mb-[4px]">{book.title}</h1>
                    <p className="text-[17px] text-[var(--label-secondary)] mb-[16px]">by {book.author}</p>

                    {/* Rating */}
                    <div className="flex items-center gap-[8px] mb-[16px]">
                        <div className="flex">{renderStars(book.rating)}</div>
                        <span className="text-[15px] font-semibold">{book.rating}</span>
                        <span className="text-[13px] text-[var(--label-tertiary)]">
                            ({book.reviews >= 1000 ? `${(book.reviews / 1000).toFixed(1)}K` : book.reviews} reviews)
                        </span>
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-[8px]">
                        {book.genre.map((genre) => (
                            <span
                                key={genre}
                                className="px-[12px] py-[4px] rounded-full bg-[var(--fill-tertiary)] text-[13px] font-medium text-[var(--label-secondary)]"
                            >
                                {genre}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="bg-[var(--bg-grouped-secondary)] rounded-[12px] p-[16px] mb-[16px]">
                    <h2 className="text-[17px] font-semibold mb-[12px]">About this book</h2>
                    <p className="text-[17px] text-[var(--label-secondary)] leading-[1.5]">
                        {book.description}
                    </p>
                </div>

                {/* Price & Actions */}
                <div className="bg-[var(--bg-grouped-secondary)] rounded-[12px] p-[16px]">
                    <div className="flex items-baseline gap-[8px] mb-[20px]">
                        <p className="text-[28px] font-bold text-[var(--label-primary)]">
                            {book.price}
                        </p>
                        <span className="text-[13px] text-[var(--label-tertiary)]">USD</span>
                    </div>

                    <div className="flex flex-col gap-[12px]">
                        {book.hasDemo && book.demoBookId && (
                            <Link href={`/reader/${book.demoBookId}`}>
                                <button className="w-full btn-primary">
                                    <BookOpen className="w-[20px] h-[20px]" />
                                    Read Demo Free
                                </button>
                            </Link>
                        )}

                        <a
                            href={book.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <button className={`w-full ${book.hasDemo ? 'btn-gray' : 'btn-primary'}`}>
                                <ExternalLink className="w-[20px] h-[20px]" />
                                Buy on Amazon
                            </button>
                        </a>
                    </div>
                </div>

                {/* Info note */}
                {book.hasDemo && (
                    <div className="mt-[16px] p-[16px] rounded-[12px] bg-[var(--system-blue)]/10">
                        <p className="text-[15px] text-[var(--label-secondary)]">
                            <span className="text-[var(--system-blue)] font-medium">Tip:</span> Try our instant translation feature. Switch between English, French, Spanish, and German while reading.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
