'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language, ReadingAnchor } from '@/lib/store';
import { updateBookLanguage } from '@/lib/api';
import { useChapters } from '@/lib/hooks/useChapters';
import { useChapterContent } from '@/lib/hooks/useChapterContent';
import { useViewportTranslation } from '@/lib/hooks/useViewportTranslation';
import { usePageGestures } from '@/lib/hooks/usePageGestures';
import { computePages, findPageForBlock, findPageByBlockPosition } from '@/lib/paginatorUtils';
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
    const {
        settings,
        updateProgress,
        getProgress,
        setBookLanguage,
        setIsTranslatingForBook,
        setAnchor: storeSetAnchor,
        getAnchor,
    } = useAppStore();
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

    const { blocks, loading: contentLoading, error: contentError } = useChapterContent(
        currentChapter?.id ?? null,
        activeLang.toUpperCase()
    );

    // displayBlocks starts from fetched blocks, gets progressively updated with translations
    const [displayBlocks, setDisplayBlocks] = useState<ContentBlock[]>([]);

    // Reset displayBlocks when blocks from the content hook change
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
    void isTranslatingAny; // used by AppleIntelligenceGlow indirectly

    // Clear translation glow when content finishes loading
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

    // Track chapter-level reading progress
    useEffect(() => {
        if (!chapters.length) return;
        const progressPct = (currentChapterIndex / chapters.length) * 100;
        updateProgress(bookId, currentChapterIndex, progressPct);
    }, [currentChapterIndex, chapters.length, bookId, updateProgress]);

    // ─── Pagination state ────────────────────────────────────────────────────
    const contentAreaRef = useRef<HTMLDivElement>(null);
    const measureContainerRef = useRef<HTMLDivElement>(null);
    const blockMeasureRefs = useRef<Map<string, HTMLElement>>(new Map());

    const [pageHeight, setPageHeight] = useState(0);
    const [pages, setPages] = useState<string[][]>([]);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    const [pagesReady, setPagesReady] = useState(false);

    // Measure the available height for content after the header
    useEffect(() => {
        if (!contentAreaRef.current) return;
        const ro = new ResizeObserver(() => {
            if (contentAreaRef.current) setPageHeight(contentAreaRef.current.clientHeight);
        });
        ro.observe(contentAreaRef.current);
        setPageHeight(contentAreaRef.current.clientHeight);
        return () => ro.disconnect();
    }, []);

    // Recompute pages only when block structure or page height changes (not on translation merges)
    const blockStructureKey = useMemo(
        () => `${displayBlocks.map((b) => b.id).join(',')}__${pageHeight}__${settings.fontSize}`,
        [displayBlocks, pageHeight, settings.fontSize]
    );
    const prevBlockStructureKey = useRef('');

    useEffect(() => {
        if (blockStructureKey === prevBlockStructureKey.current) return;
        if (pageHeight === 0 || displayBlocks.length === 0) return;
        prevBlockStructureKey.current = blockStructureKey;

        const heights = new Map<string, number>();
        blockMeasureRefs.current.forEach((el, id) => heights.set(id, el.offsetHeight));
        const computed = computePages(displayBlocks, heights, pageHeight);
        setPages(computed);
        setPagesReady(true);
    });

    // ─── Anchor restore ──────────────────────────────────────────────────────
    // Flag: have we done the initial anchor restore for this chapter load?
    const anchorRestoredRef = useRef(false);
    // Set by language-switch handler: blockId to jump to on next page recompute
    const pendingAnchorBlockId = useRef<string | null>(null);

    // Reset anchor restore flag when chapter changes
    useEffect(() => {
        anchorRestoredRef.current = false;
        setPagesReady(false);
        setPages([]);
        setCurrentPageIdx(0);
    }, [currentChapter?.id]);

    useEffect(() => {
        if (!pagesReady || pages.length === 0) return;

        // If there's a pending anchor (from language switch), use it
        const targetBlockId = pendingAnchorBlockId.current;
        if (targetBlockId !== null) {
            pendingAnchorBlockId.current = null;
            const idx = findPageForBlock(pages, targetBlockId);
            if (idx >= 0) { setCurrentPageIdx(idx); return; }
            // Fallback: by position
            const block = displayBlocks.find((b) => b.id === targetBlockId);
            if (block) {
                const byPos = findPageByBlockPosition(pages, displayBlocks, block.position);
                setCurrentPageIdx(Math.max(0, byPos));
            }
            return;
        }

        // Initial load: restore from saved anchor
        if (!anchorRestoredRef.current) {
            anchorRestoredRef.current = true;
            const anchor = getAnchor(bookId);
            if (anchor && anchor.chapterId === (currentChapter?.id ?? '')) {
                const idx = findPageForBlock(pages, anchor.blockId);
                if (idx >= 0) { setCurrentPageIdx(idx); return; }
                const byPos = findPageByBlockPosition(pages, displayBlocks, anchor.blockPosition);
                setCurrentPageIdx(Math.max(0, byPos));
            }
        }
    }, [pagesReady, pages, bookId, currentChapter?.id, displayBlocks, getAnchor]);

    // ─── Anchor save (throttled ~1 s) ────────────────────────────────────────
    const lastSavedAnchorAt = useRef(0);
    const pendingAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveAnchor = useCallback((blockId: string, blockPosition: number) => {
        if (!currentChapter) return;
        const anchor: ReadingAnchor = {
            chapterId: currentChapter.id,
            blockId,
            blockPosition,
            updatedAt: new Date().toISOString(),
        };
        const now = Date.now();
        const elapsed = now - lastSavedAnchorAt.current;

        if (elapsed >= 1000) {
            lastSavedAnchorAt.current = now;
            storeSetAnchor(bookId, anchor);
        } else {
            if (pendingAnchorTimer.current) clearTimeout(pendingAnchorTimer.current);
            pendingAnchorTimer.current = setTimeout(() => {
                lastSavedAnchorAt.current = Date.now();
                storeSetAnchor(bookId, anchor);
                pendingAnchorTimer.current = null;
            }, 1000 - elapsed);
        }
    }, [currentChapter, bookId, storeSetAnchor]);

    // ─── Page navigation ─────────────────────────────────────────────────────
    const prevChapter = currentChapterIndex > 1 ? chapters[currentChapterIndex - 2] : null;
    const nextChapter = currentChapterIndex < chapters.length ? chapters[currentChapterIndex] : null;

    const goToChapter = useCallback((index: number) => {
        if (index >= 1 && index <= chapters.length) {
            anchorRestoredRef.current = false;
            setCurrentPageIdx(0);
            setPagesReady(false);
            setPages([]);
            setCurrentChapterIndex(index);
        }
    }, [chapters.length]);

    const goToPage = useCallback((idx: number) => {
        if (idx < 0 || idx >= pages.length) return;
        setCurrentPageIdx(idx);
        const anchorBlockId = pages[idx][0];
        const block = displayBlocks.find((b) => b.id === anchorBlockId);
        if (block) saveAnchor(block.id, block.position);
    }, [pages, displayBlocks, saveAnchor]);

    const goToNextPage = useCallback(() => {
        if (currentPageIdx < pages.length - 1) {
            goToPage(currentPageIdx + 1);
        } else if (nextChapter) {
            goToChapter(currentChapterIndex + 1);
        }
    }, [currentPageIdx, pages.length, nextChapter, currentChapterIndex, goToPage, goToChapter]);

    const goToPrevPage = useCallback(() => {
        if (currentPageIdx > 0) {
            goToPage(currentPageIdx - 1);
        } else if (prevChapter) {
            goToChapter(currentChapterIndex - 1);
        }
    }, [currentPageIdx, prevChapter, currentChapterIndex, goToPage, goToChapter]);

    // ─── Language switch (lock anchor before, restore after) ─────────────────
    const handleLanguageChange = (lang: Language) => {
        // Lock the current anchor so we can restore it after the language reloads
        if (pages.length > 0 && currentChapter) {
            const anchorBlockId = pages[currentPageIdx]?.[0];
            const block = displayBlocks.find((b) => b.id === anchorBlockId);
            if (block) {
                const anchor: ReadingAnchor = {
                    chapterId: currentChapter.id,
                    blockId: block.id,
                    blockPosition: block.position,
                    updatedAt: new Date().toISOString(),
                };
                storeSetAnchor(bookId, anchor);
                pendingAnchorBlockId.current = block.id;
            }
        }

        const previousLang = activeLang;
        setPendingLang(lang);
        setIsTranslatingForBook(bookId, true);
        anchorRestoredRef.current = false; // allow restore after new blocks load

        updateBookLanguage(bookId, lang)
            .then(() => {
                setPendingLang(lang);
                setBookLanguage(bookId, lang);
            })
            .catch(() => {
                setPendingLang(previousLang === resolvedServerLang ? null : previousLang);
                setIsTranslatingForBook(bookId, false);
                pendingAnchorBlockId.current = null;
            });
    };

    const languages = availableLanguages
        .map((l) => l.toLowerCase())
        .filter((l): l is Language => ['en', 'fr', 'es', 'de', 'ru'].includes(l));

    // ─── Gesture handler ──────────────────────────────────────────────────────
    const gestures = usePageGestures({
        onPrev: goToPrevPage,
        onNext: goToNextPage,
        enabled: !isTranslating && pagesReady,
    });

    // ─── Current page blocks ──────────────────────────────────────────────────
    const currentPageBlockIds = useMemo(() => (
        pagesReady && pages[currentPageIdx] ? new Set(pages[currentPageIdx]) : new Set<string>()
    ), [pagesReady, pages, currentPageIdx]);

    const currentPageBlocks = useMemo(
        () => displayBlocks.filter((b) => currentPageBlockIds.has(b.id)),
        [displayBlocks, currentPageBlockIds]
    );

    // ─── Block-level progress ─────────────────────────────────────────────────
    const blockProgressPct = useMemo(() => {
        if (!pagesReady || pages.length === 0 || displayBlocks.length === 0) return 0;
        const anchorId = pages[currentPageIdx]?.[0];
        const anchorIdx = displayBlocks.findIndex((b) => b.id === anchorId);
        if (anchorIdx < 0) return 0;
        return Math.round((anchorIdx / displayBlocks.length) * 100);
    }, [pagesReady, pages, currentPageIdx, displayBlocks]);

    const isLoading = chaptersLoading || contentLoading;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="h-dvh flex flex-col bg-background overflow-hidden">
            <AppleIntelligenceGlow bookId={bookId} />

            {/* Fixed header — unchanged from original */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b pt-[calc(env(safe-area-inset-top)+16px)]">
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

            {/* ── Content area: fills all space between header and progress bar ── */}
            <div
                className="flex-1 overflow-hidden"
                style={{ paddingTop: 'calc(44px + env(safe-area-inset-top) + 16px)' }}
                ref={contentAreaRef}
                {...gestures}
            >
                {/* Hidden measurement container — same content width, off-screen */}
                <div
                    ref={measureContainerRef}
                    className="container max-w-2xl mx-auto px-4"
                    style={{ position: 'fixed', top: '-9999px', left: 0, right: 0, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}
                    aria-hidden="true"
                >
                    {displayBlocks.map((block) => (
                        <div
                            key={block.id}
                            ref={(el) => {
                                if (el) blockMeasureRefs.current.set(block.id, el);
                                else blockMeasureRefs.current.delete(block.id);
                            }}
                        >
                            <ContentBlockRenderer block={block} fontSize={settings.fontSize} />
                        </div>
                    ))}
                </div>

                {/* Visible page */}
                <TranslationGlow>
                    <div className="container max-w-2xl mx-auto px-4 h-full overflow-hidden">
                        {isLoading ? (
                            <>
                                <Skeleton className="h-7 w-64 mb-5" />
                                <div className="space-y-5">
                                    {[100, 95, 88, 100, 72, 100, 90, 85, 100, 60, 100, 92].map((width, i) => (
                                        <Skeleton key={i} className="h-5" style={{ width: `${width}%` }} />
                                    ))}
                                </div>
                            </>
                        ) : chaptersError ? (
                            <p className="text-sm text-destructive py-8 text-center">{chaptersError}</p>
                        ) : contentError ? (
                            <p className="text-sm text-destructive py-8 text-center">{contentError}</p>
                        ) : (
                            currentPageBlocks.map((block) => (
                                <div key={block.id} ref={getRefCallback(block.id, block.type)}>
                                    <ContentBlockRenderer block={block} fontSize={settings.fontSize} />
                                </div>
                            ))
                        )}
                    </div>
                </TranslationGlow>
            </div>

            {/* ── Progress bar ── */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-4 h-10 border-t border-border/20 text-xs text-muted-foreground"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToChapter(currentChapterIndex - 1)}
                    disabled={!prevChapter}
                    className="flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="max-w-[80px] truncate">{prevChapter?.title ?? ''}</span>
                </Button>

                <span className="text-center tabular-nums">
                    Ch.&nbsp;{currentChapterIndex}
                    {pagesReady && displayBlocks.length > 0 && (
                        <>&nbsp;·&nbsp;{blockProgressPct}%</>
                    )}
                </span>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToChapter(currentChapterIndex + 1)}
                    disabled={!nextChapter}
                    className="flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
                >
                    <span className="max-w-[80px] truncate">{nextChapter?.title ?? ''}</span>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
