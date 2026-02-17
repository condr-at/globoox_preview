'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language } from '@/lib/store';
import { updateBookLanguage } from '@/lib/api';
import { useChapters } from '@/lib/hooks/useChapters';
import { useChapterContent } from '@/lib/hooks/useChapterContent';
import { useViewportTranslation } from '@/lib/hooks/useViewportTranslation';
import { ContentBlock } from '@/lib/api';
import ReaderActionsMenu from './ReaderActionsMenu';
import TranslationGlow from './TranslationGlow';
import AppleIntelligenceGlow from './AppleIntelligenceGlow';
import LanguageSwitch from './LanguageSwitch';
import ContentBlockRenderer from './ContentBlockRenderer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ReaderViewProps {
    bookId: string;
    title: string;
    availableLanguages: string[];
    originalLanguage?: string | null;
    serverLanguage?: string | null;
}

export default function ReaderView({ bookId, title, availableLanguages, originalLanguage, serverLanguage }: ReaderViewProps) {
    const { settings, updateProgress, getProgress, setBookLanguage, setIsTranslatingForBook } = useAppStore(); //setIsTranslating
    const isTranslating = useAppStore((state) => state.isTranslatingByBook[bookId] ?? false);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(() => getProgress(bookId)?.chapter ?? 1);
    const [pendingLang, setPendingLang] = useState<Language | null>(null);

    const resolvedServerLang = useMemo<Language>(() => {
        const candidates = [serverLanguage, originalLanguage];
        for (const c of candidates) {
            const l = c?.toLowerCase() as Language;
            if (l && ['en', 'fr', 'es', 'de', 'ru'].includes(l)) return l;
        }
        return settings.language;
    }, [serverLanguage, originalLanguage, settings.language]);
    const activeLang = pendingLang ?? resolvedServerLang;

    const { chapters, loading: chaptersLoading, error: chaptersError } = useChapters(bookId);
    const currentChapter = chapters[currentChapterIndex - 1] ?? null;

    const { blocks, loading: contentLoading, error: contentError } = useChapterContent(currentChapter?.id ?? null, activeLang.toUpperCase());

    // displayBlocks starts from fetched blocks, gets progressively updated with translations
    const [displayBlocks, setDisplayBlocks] = useState<ContentBlock[]>([]);

     // When blocks from the content hook change, reset displayBlocks
    useEffect(() => {
        setDisplayBlocks(blocks);
    }, [blocks]);

    // Merge translated blocks into displayBlocks
    const handleBlocksTranslated = useCallback((translated: ContentBlock[]) => {
        setDisplayBlocks((prev) => {
            const translatedMap = new Map(translated.map((b) => [b.id, b]));
            return prev.map((b) => translatedMap.get(b.id) ?? b);
        });
    }, []);

    const { getRefCallback, isTranslatingAny } = useViewportTranslation({
        chapterId: currentChapter?.id ?? null,
        lang: activeLang.toUpperCase(),
        blocks: displayBlocks,
        sourceLanguage: originalLanguage ?? null,
        onBlocksTranslated: handleBlocksTranslated,
    });

    // Clear translation glow when content finishes loading (including on error)
    const wasLoadingRef = useRef(false);
    useEffect(() => {
        if (contentLoading) {
            wasLoadingRef.current = true;
        } else if (wasLoadingRef.current) {
            wasLoadingRef.current = false;
            setIsTranslatingForBook(bookId, false);
        }
    }, [bookId, contentLoading, setIsTranslatingForBook]);

    useEffect(() => {
        setBookLanguage(bookId, resolvedServerLang);
    }, [bookId, resolvedServerLang, setBookLanguage]);

    useEffect(() => {
        setIsTranslatingForBook(bookId, false);
    }, [bookId, setIsTranslatingForBook]);

    // Load saved progress
    useEffect(() => {
        const saved = getProgress(bookId);
        if (saved) setCurrentChapterIndex(saved.chapter);
    }, [bookId, getProgress]);

    // Track reading progress
    useEffect(() => {
        if (!chapters.length) return;
        const progressPct = (currentChapterIndex / chapters.length) * 100;
        updateProgress(bookId, currentChapterIndex, progressPct);
    }, [currentChapterIndex, chapters.length, bookId, updateProgress]);

    // Header visibility on scroll
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
                setShowHeader(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowHeader(false);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const goToChapter = (index: number, scrollToBottom = false) => {
        if (index >= 1 && index <= chapters.length) {
            setCurrentChapterIndex(index);
            if (scrollToBottom) {
                setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }), 0);
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    const handleLanguageChange = (lang: Language) => {
        const previousLang = activeLang;
        setPendingLang(lang);
        setIsTranslatingForBook(bookId, true);
        updateBookLanguage(bookId, lang)
            .then(() => {
                setPendingLang(lang);
                setBookLanguage(bookId, lang);
            })
            .catch(() => {
                setPendingLang(previousLang === resolvedServerLang ? null : previousLang);
                setIsTranslatingForBook(bookId, false);
            });
    };

    // Map uppercase API language codes to lowercase Language type for components
    const languages = availableLanguages
        .map((l) => l.toLowerCase())
        .filter((l): l is Language => ['en', 'fr', 'es', 'de', 'ru'].includes(l));

    const prevChapter = currentChapterIndex > 1 ? chapters[currentChapterIndex - 2] : null;
    const nextChapter = currentChapterIndex < chapters.length ? chapters[currentChapterIndex] : null;

    const isLoading = chaptersLoading || contentLoading;

    return (
        <div className="min-h-screen bg-background">
            <AppleIntelligenceGlow bookId={bookId} />

            <header className={`
                fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b
                transition-transform duration-300 ease-in-out
                ${showHeader ? 'translate-y-0' : '-translate-y-full'}
                pt-[calc(env(safe-area-inset-top)+16px)]
            `}>
                <div className="flex items-center justify-between h-11 px-4">
                    <Button variant="ghost" size="icon" asChild className="text-[var(--system-blue)] -ml-2 flex-shrink-0">
                        <Link href="/library">
                            <ChevronLeft className="w-6 h-6 text-[var(--system-blue)]" strokeWidth={2.5} />
                        </Link>
                    </Button>

                    <div className="flex-1 min-w-0 text-center px-1">
                        <h1 className="text-sm font-semibold truncate">{title}</h1>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                        <LanguageSwitch
                            availableLanguages={languages}
                            currentLanguage={activeLang}
                            onLanguageChange={handleLanguageChange}
                            disabled={isTranslating}
                        />
                        <ReaderActionsMenu
                            book={{
                                id: bookId,
                                languages,
                                chapters: chapters.map((c) => ({ number: c.index, title: c.title })),
                            }}
                            currentChapter={currentChapterIndex}
                            onSelectChapter={goToChapter}
                            disabled={false}
                        />
                    </div>
                </div>
            </header>

            <main className="pt-[calc(44px+env(safe-area-inset-top)+32px)]">
                <div className="container max-w-2xl mx-auto px-4">
                    {prevChapter && (
                        <Button
                            variant="ghost"
                            onClick={() => goToChapter(currentChapterIndex - 1, true)}
                            className="w-full justify-center text-[var(--system-blue)] mb-4"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1 text-[var(--system-blue)]" />
                            {prevChapter.title}
                        </Button>
                    )}

                    <TranslationGlow>
                        <div>
                            {isLoading ? (
                                <>
                                    <Skeleton className="h-7 w-64 mb-5" />
                                    <div className="space-y-5">
                                        {[100, 95, 88, 100, 72, 100, 90, 85, 100, 60, 100, 92, 78, 100, 65].map((width, i) => (
                                            <Skeleton key={i} className="h-5" style={{ width: `${width}%` }} />
                                        ))}
                                    </div>
                                </>
                            ) : chaptersError ? (
                                <p className="text-sm text-destructive py-8 text-center">{chaptersError}</p>
                            ) : contentError ? (
                                <p className="text-sm text-destructive py-8 text-center">{contentError}</p>
                            ) : (
                                displayBlocks.map((block) => (
                                    <div key={block.id} ref={getRefCallback(block.id, block.type)}>
                                        <ContentBlockRenderer
                                            block={block}
                                            fontSize={settings.fontSize}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </TranslationGlow>

                    {nextChapter && (
                        <Button
                            variant="ghost"
                            onClick={() => goToChapter(currentChapterIndex + 1)}
                            className="w-full justify-center text-[var(--system-blue)] mt-4"
                        >
                            {nextChapter.title}
                            <ChevronRight className="w-5 h-5 ml-1 text-[var(--system-blue)]" />
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
