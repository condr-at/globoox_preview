'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language, LocalizedText } from '@/lib/store';
import ReaderActionsMenu from './ReaderActionsMenu';
import TranslationGlow from './TranslationGlow';
import AppleIntelligenceGlow from './AppleIntelligenceGlow';
import LanguageSwitch from './LanguageSwitch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Chapter {
    number: number;
    title: LocalizedText;
    content: Record<Language, string>;
}

interface Book {
    id: string;
    title: string;
    author: string;
    languages: Language[];
    chapters: Chapter[];
}

interface ReaderViewProps {
    book: Book;
}

export default function ReaderView({ book }: ReaderViewProps) {
    const { settings, updateProgress, getProgress, isTranslating, setIsTranslating } = useAppStore();
    const [currentChapter, setCurrentChapter] = useState(1);
    const [displayedText, setDisplayedText] = useState('');
    const isFirstRender = useRef(true);
    const previousLanguage = useRef(settings.language);

    // Load saved progress
    useEffect(() => {
        const saved = getProgress(book.id);
        if (saved) {
            setCurrentChapter(saved.chapter);
        }
    }, [book.id, getProgress]);

    // Update displayed text when language or chapter changes
    useEffect(() => {
        const chapter = book.chapters.find(c => c.number === currentChapter);
        if (chapter) {
            const text = chapter.content[settings.language] || chapter.content.en;
            setDisplayedText(text);
        }
    }, [currentChapter, settings.language, book.chapters]);

    // Trigger translation animation only on language change (not on first render)
    useEffect(() => {
        // Skip first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Only trigger if language actually changed
        if (previousLanguage.current !== settings.language) {
            previousLanguage.current = settings.language;
            setIsTranslating(true);
            const timer = setTimeout(() => {
                setIsTranslating(false);
            }, 7000); // 7 seconds

            return () => clearTimeout(timer);
        }
    }, [settings.language, setIsTranslating]);

    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);

    // Header visibility on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show header if scrolling up or at the very top
            if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
                setShowHeader(true);
            }
            // Hide header if scrolling down and not at the top
            else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowHeader(false);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ... existing save progress effect ...
    useEffect(() => {
        const progress = (currentChapter / book.chapters.length) * 100;
        updateProgress(book.id, currentChapter, progress);
    }, [currentChapter, book.id, book.chapters.length, updateProgress]);

    const currentChapterData = book.chapters.find(c => c.number === currentChapter);
    const prevChapter = book.chapters.find(c => c.number === currentChapter - 1);
    const nextChapter = book.chapters.find(c => c.number === currentChapter + 1);

    const getChapterTitle = (chapter?: Chapter) => {
        if (!chapter) {
            return '';
        }

        if (typeof chapter.title === 'string') {
            return chapter.title;
        }

        return chapter.title[settings.language]
            || chapter.title.en
            || Object.values(chapter.title).find(Boolean)
            || `Chapter ${chapter.number}`;
    };

    const goToChapter = (num: number, scrollToBottom = false) => {
        if (num >= 1 && num <= book.chapters.length) {
            setCurrentChapter(num);
            if (scrollToBottom) {
                // Instant scroll to bottom
                setTimeout(() => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
                }, 0);
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Apple Intelligence Glow overlay */}
            <AppleIntelligenceGlow />

            {/* Navigation Bar */}
            <header className={`
                fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b 
                transition-transform duration-300 ease-in-out
                ${showHeader ? 'translate-y-0' : '-translate-y-full'}
                pt-[calc(env(safe-area-inset-top)+16px)]
            `}>
                <div className="flex items-center justify-between h-11 px-4">
                    {/* Left - Back button */}
                    <Button variant="ghost" size="icon" asChild className="text-[var(--system-blue)] -ml-2 flex-shrink-0">
                        <Link href="/library">
                            <ChevronLeft className="w-6 h-6 text-[var(--system-blue)]" strokeWidth={2.5} />
                        </Link>
                    </Button>

                    {/* Center - Title */}
                    <div className="flex-1 min-w-0 text-center px-1">
                        <h1 className="text-sm font-semibold truncate">{book.title}</h1>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex items-center flex-shrink-0">
                        <LanguageSwitch
                            availableLanguages={book.languages}
                            disabled={isTranslating}
                        />
                        <ReaderActionsMenu
                            book={{
                                id: book.id,
                                languages: book.languages,
                                chapters: book.chapters.map(c => ({ number: c.number, title: getChapterTitle(c) }))
                            }}
                            currentChapter={currentChapter}
                            onSelectChapter={goToChapter}
                            disabled={isTranslating}
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="pt-[calc(44px+env(safe-area-inset-top)+32px)]">
                <div className="container max-w-2xl mx-auto px-4">
                    {/* Previous Chapter Link */}
                    {prevChapter && (
                        <Button
                            variant="ghost"
                            onClick={() => goToChapter(currentChapter - 1, true)}
                            className="w-full justify-center text-[var(--system-blue)] mb-4"
                            disabled={isTranslating}
                        >
                            <ChevronLeft className="w-5 h-5 mr-1 text-[var(--system-blue)]" />
                            {getChapterTitle(prevChapter)}
                        </Button>
                    )}

                    <TranslationGlow>
                        <div>
                            {/* Chapter title */}
                            {isTranslating ? (
                                <Skeleton className="h-7 w-40 mb-5" />
                            ) : (
                                <h2 className="text-xl font-bold mb-5">
                                    {getChapterTitle(currentChapterData)}
                                </h2>
                            )}

                            {/* Text content */}
                            <div
                                className="reader-content"
                                style={{
                                    fontSize: `${settings.fontSize}px`,
                                }}
                            >
                                {isTranslating ? (
                                    <div className="space-y-5">
                                        {[100, 95, 88, 100, 72, 100, 90, 85, 100, 60, 100, 92, 78, 100, 65].map((width, index) => (
                                            <Skeleton
                                                key={index}
                                                className="h-5"
                                                style={{ width: `${width}%` }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    displayedText.split('\n\n').map((paragraph, index) => (
                                        <p key={index} className="mb-5 leading-relaxed">{paragraph}</p>
                                    ))
                                )}
                            </div>
                        </div>
                    </TranslationGlow>

                    {/* Next Chapter Link */}
                    {nextChapter && (
                        <Button
                            variant="ghost"
                            onClick={() => goToChapter(currentChapter + 1)}
                            className="w-full justify-center text-[var(--system-blue)] mt-4"
                            disabled={isTranslating}
                        >
                            {getChapterTitle(nextChapter)}
                            <ChevronRight className="w-5 h-5 ml-1 text-[var(--system-blue)]" />
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
