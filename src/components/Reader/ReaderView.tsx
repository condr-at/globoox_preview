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
import { computePages, findPageForBlock, findPageForBlockAndSentence, findPageByBlockPosition, normalizeBlocks } from '@/lib/paginatorUtils';
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
const LAST_PAGE_SENTINEL = '__LAST_PAGE__';

interface ReaderViewProps {
    bookId: string;
    title: string;
    availableLanguages: string[];
    originalLanguage?: string | null;
    serverLanguage?: string | null;
    coverUrl?: string | null;
}

export default function ReaderView({ bookId, title, availableLanguages, originalLanguage, serverLanguage, coverUrl }: ReaderViewProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const {
        settings,
        setBookLanguage,
        setIsTranslatingForBook,
        setAnchor: storeSetAnchor,
        getAnchor,
        updateServerProgress,
    } = useAppStore();
    const isTranslating = useAppStore((state) => state.isTranslatingByBook[bookId] ?? false);

    const [currentChapterIndex, setCurrentChapterIndex] = useState(1);
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

    const { blocks, loading: contentLoading, error: contentError, isStale, blocksLang } = useChapterContent(
        currentChapter?.id ?? null,
        activeLang.toUpperCase()
    );
    
    // displayBlocks starts from fetched blocks, gets progressively updated with translations
    const [displayBlocks, setDisplayBlocks] = useState<ContentBlock[]>([]);
    // Track which language displayBlocks was derived from
    const [displayBlocksLang, setDisplayBlocksLang] = useState<string | undefined>(undefined);

    // Reset displayBlocks when blocks from the content hook change (new language loaded)
    useEffect(() => {
        // Only update if blocks are for the correct language (not stale)
        if (blocksLang === activeLang.toUpperCase()) {
            setDisplayBlocks(blocks);
            setDisplayBlocksLang(blocksLang);
        }
    }, [blocks, blocksLang, activeLang]);

    // Content is effectively loading if:
    // - fetch is in progress
    // - blocks are stale (from different language)
    // - displayBlocks hasn't been synced with current language yet
    const isDisplayBlocksSynced = displayBlocksLang === activeLang.toUpperCase();
    const isContentLoading = contentLoading || isStale || !isDisplayBlocksSynced;

    // Merge translated blocks into displayBlocks
    const handleBlocksTranslated = useCallback((translated: ContentBlock[]) => {
        setDisplayBlocks((prev) => {
            const translatedMap = new Map(translated.map((b) => [b.id, b]));
            return prev.map((b) => translatedMap.get(b.id) ?? b);
        });
    }, []);

    const { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds } = useViewportTranslation({
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
        if (isContentLoading) {
            wasLoadingRef.current = true;
        } else if (wasLoadingRef.current) {
            wasLoadingRef.current = false;
            setIsTranslatingForBook(bookId, false);
        }
    }, [bookId, isContentLoading, setIsTranslatingForBook]);

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

    // ─── Pagination state ────────────────────────────────────────────────────
    const contentAreaRef = useRef<HTMLDivElement>(null);
    const pageViewportRef = useRef<HTMLDivElement>(null);
    const measureContainerRef = useRef<HTMLDivElement>(null);
    const blockMeasureRefs = useRef<Map<string, HTMLElement>>(new Map());

    const [pageHeight, setPageHeight] = useState(0);
    const [pages, setPages] = useState<string[][]>([]);
    const [paginatedBlocks, setPaginatedBlocks] = useState<ContentBlock[]>([]);
    const fragmentMapRef = useRef<Map<string, string>>(new Map());
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    // pagesReady: blocks have been measured and pages computed
    // visiblePagesReady: pages ready AND initial anchor has been applied (no flash to page 1)
    const [pagesReady, setPagesReady] = useState(false);
    const [visiblePagesReady, setVisiblePagesReady] = useState(false);
    const [remoteAnchorReady, setRemoteAnchorReady] = useState(false);

    // On every page change: translate current page immediately (HIGH PRIORITY), prefetch next pages (LOW PRIORITY)
    // Extend prefetch window up to 10 pages ahead to ensure continuous translation pipeline
    const PREFETCH_PAGES_AHEAD = 10;

    // Helper to convert fragment IDs to original block IDs for translation
    const resolveBlockIds = useCallback((fragmentIds: string[]): string[] => {
        const uniqueIds = new Set<string>();
        for (const id of fragmentIds) {
            // Check fragmentMap first, then look up in paginatedBlocks
            const parentId = fragmentMapRef.current.get(id);
            if (parentId) {
                uniqueIds.add(parentId);
            } else {
                // Not a fragment, might be original ID - verify in paginatedBlocks
                const block = paginatedBlocks.find((b) => b.id === id);
                uniqueIds.add(block?.parentId ?? id);
            }
        }
        return Array.from(uniqueIds);
    }, [paginatedBlocks]);

    useEffect(() => {
        // Don't enqueue translations while content is loading - wait for fresh data
        if (!pagesReady || isSourceLang || isContentLoading) return;
        const currentFragmentIds = pages[currentPageIdx] ?? [];
        // Convert fragment IDs to original block IDs for the backend
        const currentIds = resolveBlockIds(currentFragmentIds);

        // Current page blocks get HIGH priority - translate immediately
        if (currentIds.length > 0) {
            console.log(JSON.stringify({ event: 'translate_current_page', pageIdx: currentPageIdx, blockCount: currentIds.length }));
            enqueueBlocksImmediate(currentIds);
        }

        // Prefetch next N pages (LOW priority) - ensures we always have a translation pipeline
        const prefetchFragmentIds: string[] = [];
        for (let i = 1; i <= PREFETCH_PAGES_AHEAD; i++) {
            const pageIds = pages[currentPageIdx + i] ?? [];
            prefetchFragmentIds.push(...pageIds);
        }
        const prefetchIds = resolveBlockIds(prefetchFragmentIds);

        if (prefetchIds.length > 0) {
            console.log(JSON.stringify({ event: 'prefetch_enqueue', pageIdx: currentPageIdx, pagesAhead: PREFETCH_PAGES_AHEAD, totalBlocks: prefetchIds.length }));
            enqueueBlocks(prefetchIds);
        }
    }, [currentPageIdx, pagesReady, pages, enqueueBlocks, enqueueBlocksImmediate, isSourceLang, isContentLoading, resolveBlockIds]);

    // Measure the available height for content after the header
    useEffect(() => {
        if (!pageViewportRef.current) return;
        const updateHeight = () => {
            if (pageViewportRef.current) {
                setPageHeight(pageViewportRef.current.clientHeight);
            }
        };
        const ro = new ResizeObserver(updateHeight);
        ro.observe(pageViewportRef.current);
        updateHeight();
        return () => ro.disconnect();
    }, []);

    // Normalized blocks split lists into items but keep paragraphs intact
    const normalizedBlocks = useMemo(() => normalizeBlocks(displayBlocks), [displayBlocks]);

    // Recompute pages when block structure, text content, or page height changes.
    // Including text lengths ensures pages recompute when translations arrive
    // (translated text has different length than original → page breaks shift).
    const blockStructureKey = useMemo(
        () => {
            const parts = normalizedBlocks.map((b) => {
                let tl = 0;
                if ('text' in b && typeof b.text === 'string') tl = b.text.length;
                else if ('items' in b && Array.isArray(b.items)) tl = b.items.join('').length;
                return `${b.id}:${tl}`;
            });
            return `${parts.join(',')}__${pageHeight}__${settings.fontSize}__${displayBlocksLang}`;
        },
        [normalizedBlocks, pageHeight, settings.fontSize, displayBlocksLang]
    );
    const prevBlockStructureKey = useRef('');

    useEffect(() => {
        if (blockStructureKey === prevBlockStructureKey.current) return;
        if (pageHeight === 0 || normalizedBlocks.length === 0) return;

        let cancelled = false;

        async function measureAndCompute() {
            // Ensure fonts are loaded before measuring
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            if (cancelled) return;

            prevBlockStructureKey.current = blockStructureKey;

            const heights = new Map<string, number>();
            blockMeasureRefs.current.forEach((el, id) => heights.set(id, el.offsetHeight));

            const computed = computePages(
                normalizedBlocks,
                heights,
                pageHeight,
                measureContainerRef.current,
                settings.fontSize,
                displayBlocksLang ?? activeLang
            );

            setPages(computed.pages);
            setPaginatedBlocks(computed.finalBlocks);
            fragmentMapRef.current = computed.fragmentMap;
            setPagesReady(true);
        }

        measureAndCompute();

        return () => {
            cancelled = true;
        };
    }, [blockStructureKey, pageHeight, normalizedBlocks, settings.fontSize, displayBlocksLang, activeLang]);

    // ─── Anchor restore ──────────────────────────────────────────────────────
    // Set by language-switch handler: blockId + sentenceIndex to jump to on next page recompute
    const pendingAnchorBlockId = useRef<string | null>(null);
    const pendingAnchorSentenceIndex = useRef<number>(0);

    // Reset pagination state when chapter changes
    useEffect(() => {
        setPagesReady(false);
        setVisiblePagesReady(false);
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
                        sentenceIndex: remote.sentence_index ?? 0,
                        updatedAt: remote.updated_at ?? new Date().toISOString(),
                    });
                }

                setRemoteAnchorReady(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setRemoteAnchorReady(true);
                }
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
            if (targetBlockId === LAST_PAGE_SENTINEL) {
                pendingAnchorBlockId.current = null;
                pendingAnchorSentenceIndex.current = 0;
                setCurrentPageIdx(Math.max(0, pages.length - 1));
                setVisiblePagesReady(true);
                return;
            }
            const targetSentenceIndex = pendingAnchorSentenceIndex.current;
            pendingAnchorBlockId.current = null;
            pendingAnchorSentenceIndex.current = 0;
            const idx = findPageForBlockAndSentence(pages, paginatedBlocks, targetBlockId, targetSentenceIndex, fragmentMapRef.current);
            if (idx >= 0) {
                setCurrentPageIdx(idx);
                setVisiblePagesReady(true);
                return;
            }
            // Fallback: by position
            const block = displayBlocks.find((b) => b.id === targetBlockId);
            if (block) {
                const byPos = findPageByBlockPosition(pages, paginatedBlocks, block.position);
                setCurrentPageIdx(Math.max(0, byPos));
            }
            setVisiblePagesReady(true);
            return;
        }

        // Initial load: restore from saved anchor
        const anchor = getAnchor(bookId);
        if (anchor && anchor.chapterId === (currentChapter?.id ?? '')) {
            const idx = findPageForBlockAndSentence(pages, paginatedBlocks, anchor.blockId, anchor.sentenceIndex ?? 0, fragmentMapRef.current);
            if (idx >= 0) {
                setCurrentPageIdx(idx);
                setVisiblePagesReady(true);
                return;
            }
            const byPos = findPageByBlockPosition(pages, paginatedBlocks, anchor.blockPosition);
            setCurrentPageIdx(Math.max(0, byPos));
        }
        setVisiblePagesReady(true);
    }, [remoteAnchorReady, pagesReady, pages, bookId, currentChapter?.id, displayBlocks, getAnchor]);

    // ─── Anchor save (throttled ~1 s) ────────────────────────────────────────
    const lastSavedAnchorAt = useRef(0);
    const pendingAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAnchorRef = useRef<ReadingAnchor | null>(null);

    const persistAnchor = useCallback((anchor: ReadingAnchor) => {
        storeSetAnchor(bookId, anchor);
        if (!isAuthenticated) return;

        void saveReadingPosition(bookId, {
            chapter_id: anchor.chapterId,
            block_id: anchor.blockId,
            block_position: anchor.blockPosition,
            sentence_index: anchor.sentenceIndex,
            lang: activeLang.toUpperCase(),
            updated_at_client: anchor.updatedAt,
        }).then((response) => {
            if (response.persisted && response.updated_at) {
                // Sync anchor timestamp with server so subsequent PUTs are never stale
                storeSetAnchor(bookId, { ...anchor, updatedAt: response.updated_at });
                if (lastAnchorRef.current?.blockId === anchor.blockId) {
                    lastAnchorRef.current = { ...anchor, updatedAt: response.updated_at };
                }
            } else if (response.reason === 'stale_client') {
                // Server has a newer position than us. Fetch it and update store + anchor
                // so subsequent PUTs use the correct updated_at baseline.
                fetchReadingPosition(bookId).then((remote) => {
                    if (remote.block_id && remote.block_position != null && remote.updated_at) {
                        const synced: ReadingAnchor = {
                            chapterId: remote.chapter_id ?? anchor.chapterId,
                            blockId: remote.block_id,
                            blockPosition: remote.block_position,
                            sentenceIndex: remote.sentence_index ?? 0,
                            updatedAt: remote.updated_at,
                        };
                        storeSetAnchor(bookId, synced);
                        // Only reset lastAnchorRef if user hasn't moved since the stale PUT
                        if (lastAnchorRef.current?.blockId === anchor.blockId) {
                            lastAnchorRef.current = synced;
                        }
                    }
                }).catch(() => { /* silently ignore */ });
            }
            if (response.total_blocks) {
                updateServerProgress(bookId, {
                    blockPosition: anchor.blockPosition,
                    totalBlocks: response.total_blocks,
                    serverUpdatedAt: response.updated_at ?? anchor.updatedAt,
                });
            }
        }).catch(() => {
            // Keep local state as fallback when backend write fails.
        });
    }, [bookId, storeSetAnchor, isAuthenticated, activeLang, updateServerProgress]);

    const saveAnchor = useCallback((blockId: string, blockPosition: number, sentenceIndex = 0) => {
        if (!currentChapter) return;
        const anchor: ReadingAnchor = {
            chapterId: currentChapter.id,
            blockId,
            blockPosition,
            sentenceIndex,
            updatedAt: new Date().toISOString(),
        };
        lastAnchorRef.current = anchor;
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
        const handleBeforeUnload = () => {
            if (pendingAnchorTimer.current && lastAnchorRef.current) {
                persistAnchor(lastAnchorRef.current);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (pendingAnchorTimer.current) clearTimeout(pendingAnchorTimer.current);
        };
    }, [persistAnchor]);

    // ─── Page navigation ─────────────────────────────────────────────────────
    const prevChapter = currentChapterIndex > 1 ? chapters[currentChapterIndex - 2] : null;
    const nextChapter = currentChapterIndex < chapters.length ? chapters[currentChapterIndex] : null;

    // ─── Current page blocks (needed for goToChapter) ───────────────────────
    const currentPageBlockIds = useMemo(() => (
        pagesReady && pages[currentPageIdx] ? new Set(pages[currentPageIdx]) : new Set<string>()
    ), [pagesReady, pages, currentPageIdx]);

    const currentPageBlocks = useMemo(
        () => paginatedBlocks.filter((b) => currentPageBlockIds.has(b.id)),
        [paginatedBlocks, currentPageBlockIds]
    );

    const currentPageBlocksRef = useRef<ContentBlock[]>([]);

    // Keep ref updated with current page blocks
    useEffect(() => {
        currentPageBlocksRef.current = currentPageBlocks;
    }, [currentPageBlocks]);

    const goToChapter = useCallback((index: number) => {
        if (index >= 1 && index <= chapters.length) {
            // Save current anchor before switching chapters
            if (currentPageBlocksRef.current.length > 0) {
                const currentBlock = currentPageBlocksRef.current[0];
                const blockId = currentBlock.parentId ?? currentBlock.id;
                saveAnchor(blockId, currentBlock.position, (currentBlock as any).sentenceIndex ?? 0);
            }

            setCurrentPageIdx(0);
            setPagesReady(false);
            setPages([]);
            setCurrentChapterIndex(index);
        }
    }, [chapters.length, saveAnchor]);

    const goToPage = useCallback((idx: number) => {
        if (idx < 0 || idx >= pages.length) return;
        pagesReadRef.current += 1;
        setCurrentPageIdx(idx);
        const anchorBlockId = pages[idx][0];
        const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
        if (block) saveAnchor(block.parentId ?? block.id, block.position, (block as any).sentenceIndex ?? 0);
        // Translation enqueue is handled by the useEffect on currentPageIdx change.
        // No direct enqueue here to avoid double-enqueuing (which would cause an
        // unnecessary abort of the batch the useEffect just started).
    }, [pages, paginatedBlocks, saveAnchor]);

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
            pendingAnchorBlockId.current = LAST_PAGE_SENTINEL;
            pendingAnchorSentenceIndex.current = 0;
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
                    blockId: block.parentId ?? block.id,
                    blockPosition: block.position,
                    sentenceIndex: (block as any).sentenceIndex ?? 0,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // 3. Navigate to the page containing blockId (hand-off to scheduler — Task 1.2)
        if (!blockId || !pagesReady) return;
        const pageIdx = findPageForBlock(pages, blockId, fragmentMapRef.current);
        if (pageIdx >= 0) {
            setCurrentPageIdx(pageIdx);
            return;
        }
        // Fallback: find nearest page by block position
        const block = displayBlocks.find((b) => b.id === blockId);
        if (block) {
            const byPos = findPageByBlockPosition(pages, paginatedBlocks, block.position);
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
            const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
            if (block) {
                const sentenceIndex = (block as any).sentenceIndex ?? 0;
                const anchor: ReadingAnchor = {
                    chapterId: currentChapter.id,
                    blockId: block.parentId ?? block.id,
                    blockPosition: block.position,
                    sentenceIndex,
                    updatedAt: new Date().toISOString(),
                };
                persistAnchor(anchor);
                pendingAnchorBlockId.current = block.parentId ?? block.id;
                pendingAnchorSentenceIndex.current = sentenceIndex;
            }
        }

        const previousLang = activeLang;
        
        // Reset pagination state to force skeleton while new content loads
        // (similar to goToChapter behavior)
        setPagesReady(false);
        setVisiblePagesReady(false);
        setPages([]);
        setPaginatedBlocks([]);
        
        setPendingLang(lang);
        setIsTranslatingForBook(bookId, true);

        updateBookLanguage(bookId, lang)
            .then(() => {
                setBookLanguage(bookId, lang);
            })
            .catch(() => {
                // Only revert if the user hasn't switched to another language since
                setPendingLang((current) => {
                    if (current === lang) {
                        return previousLang === resolvedServerLang ? null : previousLang;
                    }
                    return current;
                });
                setIsTranslatingForBook(bookId, false);
                pendingAnchorBlockId.current = null;
            });
    };

    const languages = availableLanguages
        .map((l) => l.toLowerCase())
        .filter((l): l is Language => ['en', 'fr', 'es', 'de', 'ru'].includes(l));

    // ─── Chrome visibility (header + footer toggle) ───────────────────────────
    const [chromeVisible, setChromeVisible] = useState(true);

    const toggleChrome = useCallback(() => {
        setChromeVisible((v) => !v);
    }, []);

    // ─── Gesture handler ──────────────────────────────────────────────────────
    const allowInternalScroll = true;
    const gestures = usePageGestures({
        onPrev: goToPrevPage,
        onNext: goToNextPage,
        onToggleChrome: toggleChrome,
        enabled: !isTranslating && pagesReady,
        preserveScroll: allowInternalScroll,
    });

    // ─── Keyboard navigation (ArrowLeft / ArrowRight) ───────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isTranslating || !pagesReady) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const target = e.target;
            if (target instanceof Element) {
                const tag = target.tagName.toLowerCase();
                const isTypingField = tag === 'input' || tag === 'textarea' || tag === 'select';
                if (isTypingField || target.closest('[contenteditable="true"]')) return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPage, goToPrevPage, isTranslating, pagesReady]);

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
        if (!pagesReady || pages.length === 0 || paginatedBlocks.length === 0) return 0;
        const anchorId = pages[currentPageIdx]?.[0];
        const anchorIdx = paginatedBlocks.findIndex((b) => b.id === anchorId);
        if (anchorIdx < 0) return 0;
        return Math.round((anchorIdx / paginatedBlocks.length) * 100);
    }, [pagesReady, pages, currentPageIdx, paginatedBlocks]);

    const isLoading = chaptersLoading || isContentLoading;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-background" style={{ position: 'fixed', inset: 0, overflow: 'hidden', overscrollBehavior: 'none' } as React.CSSProperties}>
            <AppleIntelligenceGlow bookId={bookId} />

            {/* ── Header (fixed, slides out upward) ── */}
            <header
                className="fixed left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b transition-transform duration-300 ease-in-out"
                style={{
                    top: 0,
                    paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
                    transform: chromeVisible ? 'translateY(0)' : 'translateY(-100%)',
                }}
            >
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

            {/* ── Content area: fixed, full screen, constant height ── */}
            <div
                ref={contentAreaRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    touchAction: allowInternalScroll ? 'pan-y' : 'none',
                    overscrollBehavior: 'none',
                    WebkitOverflowScrolling: 'auto',
                } as React.CSSProperties}
                {...gestures}
            >
                <div
                    ref={pageViewportRef}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(env(safe-area-inset-top) + 16px + 44px)',
                        bottom: 'calc(env(safe-area-inset-bottom) + 40px)',
                        overflowY: allowInternalScroll ? 'auto' : 'hidden',
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {/* Hidden measurement container — same content width, off-screen */}
                    <div
                        ref={measureContainerRef}
                        className="container max-w-2xl mx-auto px-4"
                        style={{ position: 'fixed', top: '-9999px', left: 0, right: 0, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}
                        aria-hidden="true"
                    >
                        {normalizedBlocks.map((block) => (
                            <div
                                key={block.id}
                                ref={(el) => {
                                    if (el) blockMeasureRefs.current.set(block.id, el);
                                    else blockMeasureRefs.current.delete(block.id);
                                }}
                            >
                                <ContentBlockRenderer block={block} fontSize={settings.fontSize} coverUrl={coverUrl} />
                            </div>
                        ))}
                    </div>

                    {/* Visible page */}
                    <TranslationGlow>
                        <div className="container max-w-2xl mx-auto px-4 h-full" lang={activeLang}>
                            {isLoading || !visiblePagesReady ? (
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
                                (() => {
                                    // Find the first pending block to show "Translating..." label only on it
                                    let firstPendingFound = false;
                                    return currentPageBlocks.map((block) => {
                                        const blockId = block.parentId ?? block.id;
                                        const isPending = block.is_pending || pendingBlockIds.has(blockId);
                                        const showTranslatingLabel = isPending && !firstPendingFound;
                                        if (isPending && !firstPendingFound) firstPendingFound = true;
                                        return (
                                            <div key={block.id} ref={getRefCallback(blockId, block.type)}>
                                                <ContentBlockRenderer block={block} fontSize={settings.fontSize} isPending={isPending} showTranslatingLabel={showTranslatingLabel} coverUrl={coverUrl} />
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    </TranslationGlow>
                </div>
            </div>

            {/* ── Footer / progress bar (fixed, slides out downward) ── */}
            <div
                className="fixed left-0 right-0 z-40 flex items-center justify-center md:justify-between px-4 h-10 border-t border-border/20 text-xs text-muted-foreground bg-background/80 backdrop-blur-xl transition-transform duration-300 ease-in-out"
                style={{
                    bottom: 0,
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    transform: chromeVisible ? 'translateY(0)' : 'translateY(100%)',
                }}
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
