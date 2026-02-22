'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language, ReadingAnchor } from '@/lib/store';
import { fetchReadingPosition, saveReadingPosition, updateBookLanguage } from '@/lib/api';
import { useChapters } from '@/lib/hooks/useChapters';
import { useChapterContent } from '@/lib/hooks/useChapterContent';
import { useViewportTranslation } from '@/lib/hooks/useViewportTranslation';
import { usePageGestures } from '@/lib/hooks/usePageGestures';
import { computePages, findPageForBlock, findPageByBlockPosition } from '@/lib/paginatorUtils';
import { ContentBlock } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  trackReadingSessionStarted,
  trackReadingSessionEnded,
  trackChapterCompleted,
  trackBookFinished,
  trackLanguageSwitched,
} from '@/lib/posthog';
import ReaderActionsMenu from './ReaderActionsMenu';
import TranslationGlow from './TranslationGlow';
import AppleIntelligenceGlow from './AppleIntelligenceGlow';
import LanguageSwitch from './LanguageSwitch';
import ContentBlockRenderer from './ContentBlockRenderer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Source of a navigation event. Any source other than manual_scroll is a "jump"
// that aborts in-flight prefetch requests and updates readingAnchor immediately.
type NavigationSource = 'toc' | 'search' | 'slider' | 'link' | 'restore_anchor' | 'manual_scroll'

interface ReaderViewProps {
    bookId: string;
    title: string;
    availableLanguages: string[];
    originalLanguage?: string | null;
    serverLanguage?: string | null;
}

export default function ReaderView({ bookId, title, availableLanguages, originalLanguage, serverLanguage }: ReaderViewProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
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

    const { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate } = useViewportTranslation({
        bookId,
        chapterId: currentChapter?.id ?? null,
        lang: activeLang.toUpperCase(),
        blocks: displayBlocks,
        sourceLanguage: originalLanguage ?? null,
        onBlocksTranslated: handleBlocksTranslated,
    });
    void isTranslatingAny; // used by AppleIntelligenceGlow indirectly

    // Computed once here, also used by the prefetch effect below
    const isSourceLang = originalLanguage
        ? originalLanguage.toUpperCase() === activeLang.toUpperCase()
        : false;

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

    // ─── Reading session tracking ─────────────────────────────────────────────
    const sessionStartRef = useRef(Date.now());
    const pagesReadRef = useRef(0);
    const chaptersNavigatedRef = useRef(0);

    // Fire session_started once on mount, session_ended on unmount
    useEffect(() => {
        trackReadingSessionStarted({
            book_id: bookId,
            chapter_index: currentChapterIndex,
            language: activeLang,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            trackReadingSessionEnded({
                book_id: bookId,
                duration_seconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
                pages_read: pagesReadRef.current,
                chapters_navigated: chaptersNavigatedRef.current,
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track chapter navigation (fire chapter_completed when moving forward)
    const initChapterTrackingRef = useRef(false);
    const prevChapterIdxRef = useRef(currentChapterIndex);
    useEffect(() => {
        if (!chapters.length) return;
        if (!initChapterTrackingRef.current) {
            initChapterTrackingRef.current = true;
            prevChapterIdxRef.current = currentChapterIndex;
            return;
        }
        if (currentChapterIndex > prevChapterIdxRef.current) {
            chaptersNavigatedRef.current += 1;
            trackChapterCompleted({
                book_id: bookId,
                chapter_index: prevChapterIdxRef.current,
                total_chapters: chapters.length,
            });
        }
        prevChapterIdxRef.current = currentChapterIndex;
    }, [currentChapterIndex, chapters.length, bookId]);

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
    const [remoteAnchorReady, setRemoteAnchorReady] = useState(false);

    // On every page change: translate current page immediately (HIGH PRIORITY), prefetch next pages (LOW PRIORITY)
    // Extend prefetch window up to 10 pages ahead to ensure continuous translation pipeline
    const PREFETCH_PAGES_AHEAD = 10;
    
    useEffect(() => {
        if (!pagesReady || isSourceLang) return;
        const currentIds = pages[currentPageIdx] ?? [];
        
        // Current page blocks get HIGH priority - translate immediately
        if (currentIds.length > 0) {
            console.log(JSON.stringify({ event: 'translate_current_page', pageIdx: currentPageIdx, blockCount: currentIds.length }));
            enqueueBlocksImmediate(currentIds);
        }
        
        // Prefetch next N pages (LOW priority) - ensures we always have a translation pipeline
        const prefetchIds: string[] = [];
        for (let i = 1; i <= PREFETCH_PAGES_AHEAD; i++) {
            const pageIds = pages[currentPageIdx + i] ?? [];
            prefetchIds.push(...pageIds);
        }
        
        if (prefetchIds.length > 0) {
            console.log(JSON.stringify({ event: 'prefetch_enqueue', pageIdx: currentPageIdx, pagesAhead: PREFETCH_PAGES_AHEAD, totalBlocks: prefetchIds.length }));
            enqueueBlocks(prefetchIds);
        }
    }, [currentPageIdx, pagesReady, pages, enqueueBlocks, enqueueBlocksImmediate, isSourceLang]);

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

    // Authenticated users use backend as SSOT for reading position.
    // Guests keep purely local position in persisted store.
    useEffect(() => {
        let cancelled = false;

        if (authLoading || chaptersLoading) return;
        if (!isAuthenticated) {
            setRemoteAnchorReady(true);
            return;
        }

        setRemoteAnchorReady(false);
        fetchReadingPosition(bookId)
            .then((remote) => {
                if (cancelled) return;

                const chapterId = remote.chapter_id;
                if (!chapterId) {
                    setRemoteAnchorReady(true);
                    return;
                }

                const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
                if (chapterIdx >= 0) {
                    setCurrentChapterIndex(chapterIdx + 1);
                }

                if (remote.block_id && remote.block_position != null) {
                    storeSetAnchor(bookId, {
                        chapterId,
                        blockId: remote.block_id,
                        blockPosition: remote.block_position,
                        updatedAt: remote.updated_at ?? new Date().toISOString(),
                    });
                }

                setRemoteAnchorReady(true);
            })
            .catch(() => {
                if (!cancelled) setRemoteAnchorReady(true);
            });

        return () => {
            cancelled = true;
        };
    }, [authLoading, chaptersLoading, isAuthenticated, bookId, chapters, storeSetAnchor]);

    useEffect(() => {
        if (!remoteAnchorReady) return;
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
    }, [remoteAnchorReady, pagesReady, pages, bookId, currentChapter?.id, displayBlocks, getAnchor]);

    // ─── Anchor save (throttled ~1 s) ────────────────────────────────────────
    const lastSavedAnchorAt = useRef(0);
    const pendingAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persistAnchor = useCallback((anchor: ReadingAnchor) => {
        storeSetAnchor(bookId, anchor);
        if (!isAuthenticated) return;

        void saveReadingPosition(bookId, {
            chapter_id: anchor.chapterId,
            block_id: anchor.blockId,
            block_position: anchor.blockPosition,
            lang: activeLang.toUpperCase(),
            updated_at_client: anchor.updatedAt,
        }).catch(() => {
            // Keep local state as fallback when backend write fails.
        });
    }, [bookId, storeSetAnchor, isAuthenticated, activeLang]);

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
            persistAnchor(anchor);
        } else {
            if (pendingAnchorTimer.current) clearTimeout(pendingAnchorTimer.current);
            pendingAnchorTimer.current = setTimeout(() => {
                lastSavedAnchorAt.current = Date.now();
                persistAnchor(anchor);
                pendingAnchorTimer.current = null;
            }, 1000 - elapsed);
        }
    }, [currentChapter, persistAnchor]);

    useEffect(() => {
        return () => {
            if (pendingAnchorTimer.current) clearTimeout(pendingAnchorTimer.current);
        };
    }, []);

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
        pagesReadRef.current += 1;
        setCurrentPageIdx(idx);
        const anchorBlockId = pages[idx][0];
        const block = displayBlocks.find((b) => b.id === anchorBlockId);
        if (block) saveAnchor(block.id, block.position);
        
        // Directly trigger prefetch for upcoming pages on every navigation
        if (!isSourceLang && pagesReady) {
            const prefetchIds: string[] = [];
            for (let i = 0; i <= PREFETCH_PAGES_AHEAD; i++) {
                const pageIds = pages[idx + i] ?? [];
                prefetchIds.push(...pageIds);
            }
            if (prefetchIds.length > 0) {
                // Current page (idx) as high priority, rest as prefetch
                const currentPageIds = pages[idx] ?? [];
                const futurePageIds = prefetchIds.filter(id => !currentPageIds.includes(id));
                
                if (currentPageIds.length > 0) enqueueBlocksImmediate(currentPageIds);
                if (futurePageIds.length > 0) enqueueBlocks(futurePageIds);
            }
        }
    }, [pages, displayBlocks, saveAnchor, isSourceLang, pagesReady, enqueueBlocksImmediate, enqueueBlocks]);

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

    // ─── Navigation intent API ────────────────────────────────────────────────
    // Single entry point for all navigation events. Any source other than
    // manual_scroll is a "jump": abort prefetch, set anchor, go to page.
    const navigateTo = useCallback((blockId: string, source: NavigationSource) => {
        if (source === 'manual_scroll') return; // handled organically by saveAnchor

        // 1. Abort all in-flight and queued prefetch (translation) requests
        abortAll();

        // 2. Set readingAnchor immediately so it's available to the scheduler (Task 1.2)
        if (blockId && currentChapter) {
            const block = displayBlocks.find((b) => b.id === blockId);
            if (block) {
                storeSetAnchor(bookId, {
                    chapterId: currentChapter.id,
                    blockId: block.id,
                    blockPosition: block.position,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // 3. Navigate to the page containing blockId (hand-off to scheduler — Task 1.2)
        if (!blockId || !pagesReady) return;
        const pageIdx = findPageForBlock(pages, blockId);
        if (pageIdx >= 0) {
            setCurrentPageIdx(pageIdx);
            return;
        }
        // Fallback: find nearest page by block position
        const block = displayBlocks.find((b) => b.id === blockId);
        if (block) {
            const byPos = findPageByBlockPosition(pages, displayBlocks, block.position);
            setCurrentPageIdx(Math.max(0, byPos));
        }
    }, [abortAll, currentChapter, displayBlocks, bookId, storeSetAnchor, pages, pagesReady]);

    // TOC selects chapters (not blocks). Abort prefetch immediately, then switch chapter.
    const handleSelectChapterFromToc = useCallback((chapterIndex: number) => {
        navigateTo('', 'toc'); // abort + mark as jump; no in-chapter blockId yet
        goToChapter(chapterIndex);
    }, [navigateTo, goToChapter]);

    // ─── Language switch (lock anchor before, restore after) ─────────────────
    const handleLanguageChange = (lang: Language) => {
        trackLanguageSwitched({ book_id: bookId, from_language: activeLang, to_language: lang });
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
                persistAnchor(anchor);
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

    // ─── Book finished detection ──────────────────────────────────────────────
    const bookFinishedTrackedRef = useRef(false);
    useEffect(() => {
        if (!pagesReady || pages.length === 0 || chapters.length === 0) return;
        if (currentChapterIndex === chapters.length && currentPageIdx === pages.length - 1) {
            if (!bookFinishedTrackedRef.current) {
                bookFinishedTrackedRef.current = true;
                trackBookFinished({ book_id: bookId, total_chapters: chapters.length });
            }
        }
    }, [currentChapterIndex, currentPageIdx, chapters.length, pages.length, pagesReady, bookId]);

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
                            onSelectChapter={handleSelectChapterFromToc}
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
                className="flex-shrink-0 flex items-center justify-center md:justify-between px-4 h-10 border-t border-border/20 text-xs text-muted-foreground"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={!prevChapter}
                    className="hidden md:flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
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
                    onClick={goToNextPage}
                    disabled={!nextChapter}
                    className="hidden md:flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
                >
                    <span className="max-w-[80px] truncate">{nextChapter?.title ?? ''}</span>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
