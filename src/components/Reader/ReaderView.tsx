'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language, ReadingAnchor } from '@/lib/store';
import { fetchContent, fetchReadingPosition, saveReadingPosition, updateBookLanguage, translateChapterTitles } from '@/lib/api';
import { useChapters } from '@/lib/hooks/useChapters';
import { useChapterContent } from '@/lib/hooks/useChapterContent';
import { useViewportTranslation } from '@/lib/hooks/useViewportTranslation';
import { usePageGestures } from '@/lib/hooks/usePageGestures';
import { computePages, findPageForBlock, findPageForBlockAndSentence, findPageByBlockPosition, normalizeBlocks } from '@/lib/paginatorUtils';
import { ContentBlock } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    getCachedChapterBlockIds,
    getCachedChapterLayout,
    getCachedReadingPosition,
    setCachedChapterContent,
    setCachedChapterLayout,
    setCachedReadingPosition,
    getCachedTocTitles,
    setCachedTocTitles,
} from '@/lib/contentCache';
import { mergeDisplayBlocksPreservingTranslations } from '@/lib/reader/mergeDisplayBlocks';
import { isBlockPendingForActiveLang, isTranslatableBlock } from '@/lib/translationState';
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

function isPendingChapterTitle(
    chapterId: string,
    activeLang: string,
    sourceLanguage: string | null | undefined,
    translatedTitles: Map<string, string>,
): boolean {
    if (!sourceLanguage) return false;
    if (sourceLanguage.toUpperCase() === activeLang.toUpperCase()) return false;
    return !translatedTitles.has(chapterId);
}

type PaginationCacheEntry = {
    pages: string[][];
    finalBlocks: ContentBlock[];
    fragmentMap: Map<string, string>;
    currentPageIdx: number;
    savedAt: number;
};

function getSentenceIndex(block: ContentBlock): number {
    return 'sentenceIndex' in block && typeof block.sentenceIndex === 'number' ? block.sentenceIndex : 0;
}

function hashString(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

function getLayoutContentSignature(blocks: ContentBlock[]): string {
    const serialized = blocks.map((block) => {
        switch (block.type) {
            case 'paragraph':
            case 'quote':
                return `${block.id}|${block.type}|${block.position}|${block.text ?? ''}`;
            case 'heading':
                return `${block.id}|${block.type}|${block.position}|${block.level}|${block.text ?? ''}`;
            case 'list':
                return `${block.id}|${block.type}|${block.position}|${block.ordered ? '1' : '0'}|${(block.items ?? []).join('\u001f')}`;
            case 'image':
                return `${block.id}|${block.type}|${block.position}|${block.src ?? ''}|${block.alt ?? ''}|${block.caption ?? ''}`;
            case 'hr':
                return `${block.id}|${block.type}|${block.position}`;
            default:
                return `${block.id}|${block.type}|${block.position}`;
        }
    }).join('\u001e');
    return hashString(serialized);
}

// Module-level cache so it survives route navigation (unmount/remount).
const paginationCache = new Map<string, PaginationCacheEntry>();

export default function ReaderView({ bookId, title, availableLanguages, originalLanguage, serverLanguage, coverUrl }: ReaderViewProps) {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const {
        settings,
        perBookLanguages,
        syncVersions,
        setBookLanguage,
        setIsTranslatingForBook,
        setAnchor: storeSetAnchor,
        getAnchor,
        updateServerProgress,
    } = useAppStore();
    const isTranslating = useAppStore((state) => state.isTranslatingByBook[bookId] ?? false);

    const [currentChapterIndex, setCurrentChapterIndex] = useState(1);
    const [pendingLang, setPendingLang] = useState<Language | null>(null);
    const [isLanguageSwitching, setIsLanguageSwitching] = useState(false);

    const resolvedServerLang = useMemo<Language>(() => {
        const localBookLang = perBookLanguages[bookId];
        const candidates = [localBookLang, serverLanguage, originalLanguage];
        for (const c of candidates) {
            const l = c?.toLowerCase() as Language;
            if (l && ['en', 'fr', 'es', 'de', 'ru'].includes(l)) return l;
        }
        return settings.language;
    }, [perBookLanguages, bookId, serverLanguage, originalLanguage, settings.language]);
    const activeLang = pendingLang ?? resolvedServerLang;

    const { chapters, loading: chaptersLoading, error: chaptersError } = useChapters(bookId);
    const currentChapter = chapters[currentChapterIndex - 1] ?? null;
    const currentChapterId = currentChapter?.id ?? null;

    // Chapter title translation state
    const [translatedChapterTitles, setTranslatedChapterTitles] = useState<Map<string, string>>(new Map());
    const [isTranslatingChapterTitles, setIsTranslatingChapterTitles] = useState(false);
    const translatingTitlesLangRef = useRef<string | null>(null);

    // Reset translated titles when active language changes
    useEffect(() => {
        setTranslatedChapterTitles(new Map());
        translatingTitlesLangRef.current = null;
    }, [activeLang]);

    // Best-effort: hydrate translated chapter titles from IndexedDB for fast reloads.
    useEffect(() => {
        let cancelled = false;
        const scopeKey = user?.id ?? 'guest';
        void getCachedTocTitles(scopeKey, bookId, activeLang).then((titles) => {
            if (cancelled) return;
            if (!titles) return;
            setTranslatedChapterTitles(new Map(Object.entries(titles)));
        });
        return () => {
            cancelled = true;
        };
    }, [bookId, activeLang, user?.id]);

    const { blocks, loading: contentLoading, error: contentError, isStale, blocksLang, hasServerSnapshot } = useChapterContent(
        currentChapterId,
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
            setDisplayBlocks((prev) =>
                mergeDisplayBlocksPreservingTranslations(prev, blocks, {
                    // Never preserve translated text across different target languages.
                    preserve: displayBlocksLang === blocksLang,
                })
            );
            setDisplayBlocksLang(blocksLang);
        }
    }, [blocks, blocksLang, activeLang, displayBlocksLang]);

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

    const { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds, reconcileBlocks } = useViewportTranslation({
        bookId,
        chapterId: currentChapterId,
        lang: activeLang.toUpperCase(),
        blocks: displayBlocks,
        sourceLanguage: originalLanguage ?? null,
        canTranslate: hasServerSnapshot,
        onBlocksTranslated: handleBlocksTranslated,
    });
    void isTranslatingAny; // used by AppleIntelligenceGlow indirectly

    // Computed once here, also used by the prefetch effect below
    const isSourceLang = originalLanguage
        ? originalLanguage.toUpperCase() === activeLang.toUpperCase()
        : false;

    useEffect(() => {
        if (perBookLanguages[bookId]) return;
        setBookLanguage(bookId, resolvedServerLang);
    }, [bookId, perBookLanguages, resolvedServerLang, setBookLanguage]);

    // NOTE: glow state is derived later, once pagination + currentPageBlocks are available.

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
        const sessionStartedAt = sessionStartRef.current;
        return () => {
            trackReadingSessionEnded({
                book_id: bookId,
                duration_seconds: Math.round((Date.now() - sessionStartedAt) / 1000),
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
    const [pageWidth, setPageWidth] = useState(0);
    const [pages, setPages] = useState<string[][]>([]);
    const [paginatedBlocks, setPaginatedBlocks] = useState<ContentBlock[]>([]);
    const fragmentMapRef = useRef<Map<string, string>>(new Map());
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    // pagesReady: blocks have been measured and pages computed
    // visiblePagesReady: pages ready AND initial anchor has been applied (no flash to page 1)
    const [pagesReady, setPagesReady] = useState(false);
    const [visiblePagesReady, setVisiblePagesReady] = useState(false);
    const [remoteAnchorReady, setRemoteAnchorReady] = useState(false);
    const [layoutCacheReadyKey, setLayoutCacheReadyKey] = useState('');
    const currentPageIdxRef = useRef(0);

    // Translation windows are block-based around the current reading position.
    const PREFETCH_BLOCKS_FORWARD = 20;
    const PREFETCH_BLOCKS_BACKWARD = 10;
    const HIGH_PRIORITY_VISIBLE_BLOCKS = 2;

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
        if (!pagesReady || isSourceLang || isContentLoading) return;

        let cancelled = false;

        const run = async () => {
            const currentFragmentIds = pages[currentPageIdx] ?? [];
            const currentIds = resolveBlockIds(currentFragmentIds);
            const anchorBlockId = currentIds[0] ?? null;
            const anchorIdx = anchorBlockId ? displayBlocks.findIndex((block) => block.id === anchorBlockId) : -1;
            const chapterIdx = currentChapterIndex - 1;

            const loadChapterIds = async (idx: number): Promise<string[]> => {
                const chapter = chapters[idx];
                if (!chapter) return [];
                const cachedIds = await getCachedChapterBlockIds(chapter.id);
                if (cachedIds.length > 0) return cachedIds;
                try {
                    const nextBlocks = await fetchContent(chapter.id, activeLang.toUpperCase());
                    await setCachedChapterContent(chapter.id, activeLang.toUpperCase(), nextBlocks);
                    return nextBlocks.map((block) => block.id);
                } catch {
                    return [];
                }
            };

            const forwardIds: string[] = [];
            if (anchorIdx >= 0) {
                forwardIds.push(...displayBlocks.slice(anchorIdx + 1).map((block) => block.id));
            }
            for (let idx = chapterIdx + 1; forwardIds.length < PREFETCH_BLOCKS_FORWARD && idx < chapters.length; idx += 1) {
                forwardIds.push(...(await loadChapterIds(idx)));
            }

            const backwardIds: string[] = [];
            if (anchorIdx >= 0) {
                backwardIds.unshift(...displayBlocks.slice(Math.max(0, anchorIdx - PREFETCH_BLOCKS_BACKWARD), anchorIdx).map((block) => block.id));
            }
            for (let idx = chapterIdx - 1; backwardIds.length < PREFETCH_BLOCKS_BACKWARD && idx >= 0; idx -= 1) {
                const ids = await loadChapterIds(idx);
                backwardIds.unshift(...ids);
            }

            const boundedForwardIds = forwardIds.slice(0, PREFETCH_BLOCKS_FORWARD);
            const boundedBackwardIds = backwardIds.slice(Math.max(0, backwardIds.length - PREFETCH_BLOCKS_BACKWARD));

            if (cancelled) return;

            const reconcileIds = Array.from(new Set([...currentIds, ...boundedForwardIds, ...boundedBackwardIds]));
            if (reconcileIds.length > 0) {
                void reconcileBlocks(reconcileIds);
            }

            if (currentIds.length > 0) {
                const visibleHighIds = currentIds.slice(0, HIGH_PRIORITY_VISIBLE_BLOCKS);
                const visibleRemainingIds = currentIds.slice(HIGH_PRIORITY_VISIBLE_BLOCKS);
                console.log(JSON.stringify({
                    event: 'translate_current_page',
                    pageIdx: currentPageIdx,
                    blockCount: currentIds.length,
                    visibleHighCount: visibleHighIds.length,
                    visibleDeferredCount: visibleRemainingIds.length,
                }));
                if (visibleHighIds.length > 0) {
                    enqueueBlocksImmediate(visibleHighIds);
                }
                if (visibleRemainingIds.length > 0) {
                    enqueueBlocks(visibleRemainingIds);
                }
            }

            if (boundedForwardIds.length > 0) {
                console.log(JSON.stringify({ event: 'prefetch_forward_enqueue', pageIdx: currentPageIdx, totalBlocks: boundedForwardIds.length }));
                enqueueBlocks(boundedForwardIds);
            }
            if (boundedBackwardIds.length > 0) {
                console.log(JSON.stringify({ event: 'prefetch_backward_enqueue', pageIdx: currentPageIdx, totalBlocks: boundedBackwardIds.length }));
                enqueueBlocks(boundedBackwardIds);
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [currentPageIdx, pagesReady, pages, enqueueBlocks, enqueueBlocksImmediate, isSourceLang, isContentLoading, resolveBlockIds, displayBlocks, reconcileBlocks, chapters, currentChapterIndex, activeLang]);

    // Measure the available height for content after the header
    useEffect(() => {
        if (!pageViewportRef.current) return;
        const updateHeight = () => {
            if (pageViewportRef.current) {
                setPageHeight(pageViewportRef.current.clientHeight);
                setPageWidth(pageViewportRef.current.clientWidth);
            }
        };
        const ro = new ResizeObserver(updateHeight);
        ro.observe(pageViewportRef.current);
        updateHeight();
        return () => ro.disconnect();
    }, []);

    // Normalized blocks split lists into items but keep paragraphs intact
    const normalizedBlocks = useMemo(() => normalizeBlocks(displayBlocks), [displayBlocks]);

    // ID of the first image block in chapter 1 — only it should be rendered as the book cover.
    // Images in all other chapters are relative EPUB paths that cannot be resolved and are hidden.
    const firstImageBlockId = useMemo(
        () => currentChapterIndex === 1 ? displayBlocks.find((b) => b.type === 'image')?.id : undefined,
        [displayBlocks, currentChapterIndex]
    );

    // Recompute pages when block structure, text content, or page height changes.
    // Including text lengths ensures pages recompute when translations arrive
    // (translated text has different length than original → page breaks shift).
    const blockStructureKey = useMemo(
        () => {
            const contentSignature = getLayoutContentSignature(normalizedBlocks);
            return `${contentSignature}__${pageWidth}__${pageHeight}__${settings.fontSize}__${displayBlocksLang}`;
        },
        [normalizedBlocks, pageWidth, pageHeight, settings.fontSize, displayBlocksLang]
    );
    const prevBlockStructureKey = useRef('');
    const lastProgressFetchAtRef = useRef<Map<string, number>>(new Map());
    const lastHandledProgressScopeRef = useRef<string | null>(null);

    // In-memory pagination cache to avoid skeleton flashes on repeated opens.
    // Keyed by computed layout + chapter to ensure correctness across font/viewport/lang changes.
    const paginationCacheKey = useMemo(() => {
        const chapterId = currentChapter?.id ?? '';
        return `${bookId}::${chapterId}::${blockStructureKey}`;
    }, [bookId, currentChapter?.id, blockStructureKey]);
    const localAnchorChapterAppliedRef = useRef<string | null>(null);
    const restoredFromPaginationCacheRef = useRef(false);

    useEffect(() => {
        if (chaptersLoading || chapters.length === 0) return;
        const anchor = getAnchor(bookId);
        if (!anchor?.chapterId) return;

        const applyKey = `${bookId}::${anchor.chapterId}`;
        if (localAnchorChapterAppliedRef.current === applyKey) return;

        const chapterIdx = chapters.findIndex((chapter) => chapter.id === anchor.chapterId);
        if (chapterIdx < 0) return;

        localAnchorChapterAppliedRef.current = applyKey;
        setCurrentChapterIndex((prev) => (prev === chapterIdx + 1 ? prev : chapterIdx + 1));
    }, [bookId, chapters, chaptersLoading, getAnchor]);

    useEffect(() => {
        if (layoutCacheReadyKey !== paginationCacheKey) return;
        if (blockStructureKey === prevBlockStructureKey.current) return;
        if (pageHeight === 0 || pageWidth === 0 || normalizedBlocks.length === 0) return;

        let cancelled = false;
        setVisiblePagesReady(false);

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
                displayBlocksLang ?? activeLang,
                1,
                blockMeasureRefs.current,
            );

            setPages(computed.pages);
            setPaginatedBlocks(computed.finalBlocks);
            fragmentMapRef.current = computed.fragmentMap;
            setPagesReady(true);

            // Update cache for instant reopen.
            paginationCache.set(paginationCacheKey, {
                pages: computed.pages,
                finalBlocks: computed.finalBlocks,
                fragmentMap: computed.fragmentMap,
                currentPageIdx: currentPageIdxRef.current,
                savedAt: Date.now(),
            });

            void setCachedChapterLayout({
                key: paginationCacheKey,
                bookId,
                chapterId: currentChapter?.id ?? '',
                layoutKey: blockStructureKey,
                pages: computed.pages,
                finalBlocks: computed.finalBlocks,
                fragmentEntries: Array.from(computed.fragmentMap.entries()),
                currentPageIdx: currentPageIdxRef.current,
            }).catch(() => {
                // Ignore IDB failures; memory cache still keeps navigation smooth.
            });
        }

        void measureAndCompute();

        return () => {
            cancelled = true;
        };
    }, [layoutCacheReadyKey, paginationCacheKey, blockStructureKey, pageHeight, pageWidth, normalizedBlocks, settings.fontSize, displayBlocksLang, activeLang, currentChapter?.id, bookId]);

    // ─── Anchor restore ──────────────────────────────────────────────────────
    // Set by language-switch handler: blockId + sentenceIndex to jump to on next page recompute
    const pendingAnchorBlockId = useRef<string | null>(null);
    const pendingAnchorSentenceIndex = useRef<number>(0);

    // Reset pagination state when chapter changes — but first try to restore from cache to avoid flashing skeletons.
    useEffect(() => {
        const chapterId = currentChapter?.id ?? '';
        if (!chapterId) return;

        let cancelled = false;
        setLayoutCacheReadyKey('');
        restoredFromPaginationCacheRef.current = false;
        setPagesReady(false);
        setVisiblePagesReady(false);
        setPages([]);
        setPaginatedBlocks([]);
        fragmentMapRef.current = new Map();
        setCurrentPageIdx(0);

        const cached = paginationCache.get(paginationCacheKey);
        if (cached) {
            restoredFromPaginationCacheRef.current = true;
            prevBlockStructureKey.current = blockStructureKey;
            setPages(cached.pages);
            setPaginatedBlocks(cached.finalBlocks);
            fragmentMapRef.current = cached.fragmentMap;
            setPagesReady(true);
            setCurrentPageIdx(Math.max(0, Math.min(cached.currentPageIdx, cached.pages.length - 1)));
            setVisiblePagesReady(false);
            setLayoutCacheReadyKey(paginationCacheKey);
            return;
        }

        void getCachedChapterLayout(paginationCacheKey)
            .then((cachedLayout) => {
                if (cancelled) return;
                if (cachedLayout && cachedLayout.layoutKey === blockStructureKey) {
                    restoredFromPaginationCacheRef.current = true;
                    prevBlockStructureKey.current = blockStructureKey;
                    setPages(cachedLayout.pages);
                    setPaginatedBlocks(cachedLayout.finalBlocks);
                    fragmentMapRef.current = new Map(cachedLayout.fragmentEntries);
                    setPagesReady(true);
                    setCurrentPageIdx(Math.max(0, Math.min(cachedLayout.currentPageIdx, cachedLayout.pages.length - 1)));
                    setVisiblePagesReady(false);
                }
            })
            .catch(() => {
                // Ignore cache hydration failures; a fresh compute will follow.
            })
            .finally(() => {
                if (cancelled) return;
                setLayoutCacheReadyKey(paginationCacheKey);
            });

        return () => {
            cancelled = true;
        };
    }, [currentChapter?.id, paginationCacheKey, blockStructureKey]);

    useEffect(() => {
        if (!pagesReady || pages.length === 0) return;
        const cached = paginationCache.get(paginationCacheKey);
        if (!cached) return;
        paginationCache.set(paginationCacheKey, { ...cached, currentPageIdx, savedAt: Date.now() });
    }, [currentPageIdx, pagesReady, pages.length, paginationCacheKey]);

    // Authenticated users: local-first anchor restore + conditional server revalidation.
    useEffect(() => {
        let cancelled = false;

        if (authLoading || chaptersLoading) return;
        if (!isAuthenticated) {
            setRemoteAnchorReady(true);
            return;
        }

        const scopeKey = user?.id ?? 'guest';
        const localAnchor = getAnchor(bookId);
        const hasLocalAnchor = !!localAnchor;
        const currentProgressScope = syncVersions.progress;
        const scopeChanged =
            !!currentProgressScope &&
            currentProgressScope !== lastHandledProgressScopeRef.current;
        const lastFetchAt = lastProgressFetchAtRef.current.get(bookId) ?? 0;
        const ttlExpired = Date.now() - lastFetchAt > 5 * 60 * 1000;
        const shouldFetchRemote = !hasLocalAnchor || scopeChanged || ttlExpired;

        // Never block initial render if we already have local anchor.
        setRemoteAnchorReady(hasLocalAnchor);
        console.log(JSON.stringify({
            event: 'reading_position_revalidate_decision',
            bookId,
            hasLocalAnchor,
            scopeChanged,
            ttlExpired,
            shouldFetchRemote,
        }));

        // Fast restore from persisted cache, then revalidate against server.
        if (!hasLocalAnchor) {
            setRemoteAnchorReady(false);
        }
        void getCachedReadingPosition(scopeKey, bookId).then((cached) => {
            if (cancelled) return;
            const remote = cached?.position;
            const chapterId = remote?.chapter_id;
            if (!chapterId) return;

            // Apply cached server anchor only when no stronger local anchor exists.
            if (!hasLocalAnchor) {
                const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
                if (chapterIdx >= 0) setCurrentChapterIndex(chapterIdx + 1);

                if (remote.block_id && remote.block_position != null) {
                    storeSetAnchor(bookId, {
                        chapterId,
                        blockId: remote.block_id,
                        blockPosition: remote.block_position,
                        sentenceIndex: remote.sentence_index ?? 0,
                        updatedAt: remote.updated_at ?? new Date().toISOString(),
                    });
                }
            }

            setRemoteAnchorReady(true);
        }).catch(() => {
            // ignore
        });

        if (!shouldFetchRemote) {
            if (currentProgressScope) {
                lastHandledProgressScopeRef.current = currentProgressScope;
            }
            return () => {
                cancelled = true;
            };
        }

        fetchReadingPosition(bookId)
            .then((remote) => {
                if (cancelled) return;

                const chapterId = remote.chapter_id;
                if (!chapterId) {
                    lastProgressFetchAtRef.current.set(bookId, Date.now());
                    if (currentProgressScope) {
                        lastHandledProgressScopeRef.current = currentProgressScope;
                    }
                    setRemoteAnchorReady(true);
                    return;
                }

                // Soft reconcile: only force navigation when local anchor is missing
                // or server progress scope definitely changed.
                const shouldApplyRemoteAnchor = !hasLocalAnchor || scopeChanged;
                if (shouldApplyRemoteAnchor) {
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
                }

                void setCachedReadingPosition(scopeKey, bookId, { position: remote, updatedAt: remote.updated_at ?? null });
                lastProgressFetchAtRef.current.set(bookId, Date.now());
                if (currentProgressScope) {
                    lastHandledProgressScopeRef.current = currentProgressScope;
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
    }, [authLoading, chaptersLoading, isAuthenticated, bookId, chapters, storeSetAnchor, user?.id, getAnchor, syncVersions.progress]);

    useEffect(() => {
        if (!remoteAnchorReady) return;
        if (!pagesReady || pages.length === 0) return;
        if (visiblePagesReady && pendingAnchorBlockId.current === null) return;

        if (restoredFromPaginationCacheRef.current && pendingAnchorBlockId.current === null) {
            setVisiblePagesReady(true);
            return;
        }

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
            if (anchor.fragmentId) {
                const exactPageIdx = pages.findIndex((page) => page.includes(anchor.fragmentId!));
                if (exactPageIdx >= 0) {
                    setCurrentPageIdx(exactPageIdx);
                    setVisiblePagesReady(true);
                    return;
                }
            }
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
    }, [remoteAnchorReady, pagesReady, pages, bookId, currentChapter?.id, displayBlocks, getAnchor, paginatedBlocks, visiblePagesReady]);

    // ─── Anchor save (throttled ~1 s) ────────────────────────────────────────
    const lastSavedAnchorAt = useRef(0);
    const pendingAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAnchorRef = useRef<ReadingAnchor | null>(null);

    const persistAnchor = useCallback((anchor: ReadingAnchor) => {
        storeSetAnchor(bookId, anchor);
        if (!isAuthenticated) return;

        const scopeKey = user?.id ?? 'guest';
        // Persist the last-known local anchor so reloads are instant even if the network write fails.
        void setCachedReadingPosition(scopeKey, bookId, {
            position: {
                book_id: bookId,
                chapter_id: anchor.chapterId,
                block_id: anchor.blockId,
                block_position: anchor.blockPosition,
                sentence_index: anchor.sentenceIndex,
                total_blocks: null,
                lang: activeLang.toUpperCase(),
                updated_at: anchor.updatedAt,
            },
            updatedAt: anchor.updatedAt,
            pendingAnchor: anchor,
        });

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
                const syncedAnchor = { ...anchor, updatedAt: response.updated_at };
                storeSetAnchor(bookId, syncedAnchor);
                if (lastAnchorRef.current?.blockId === anchor.blockId) {
                    lastAnchorRef.current = syncedAnchor;
                }
                void setCachedReadingPosition(scopeKey, bookId, {
                    position: {
                        book_id: bookId,
                        chapter_id: anchor.chapterId,
                        block_id: anchor.blockId,
                        block_position: anchor.blockPosition,
                        sentence_index: anchor.sentenceIndex,
                        total_blocks: response.total_blocks ?? null,
                        lang: activeLang.toUpperCase(),
                        updated_at: response.updated_at,
                    },
                    updatedAt: response.updated_at,
                });
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
                        void setCachedReadingPosition(scopeKey, bookId, { position: remote, updatedAt: remote.updated_at });
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
    }, [bookId, storeSetAnchor, isAuthenticated, activeLang, updateServerProgress, user?.id]);

    const saveAnchor = useCallback((blockId: string, blockPosition: number, sentenceIndex = 0, fragmentId?: string) => {
        if (!currentChapter) return;
        const anchor: ReadingAnchor = {
            chapterId: currentChapter.id,
            blockId,
            fragmentId,
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

    // ─── Current page blocks (needed for goToChapter) ───────────────────────
    const currentPageBlockIds = useMemo(() => (
        pagesReady && pages[currentPageIdx] ? new Set(pages[currentPageIdx]) : new Set<string>()
    ), [pagesReady, pages, currentPageIdx]);

    const currentPageBlocks = useMemo(
        () => paginatedBlocks.filter((b) => currentPageBlockIds.has(b.id)),
        [paginatedBlocks, currentPageBlockIds]
    );

    useEffect(() => {
        currentPageIdxRef.current = currentPageIdx;
    }, [currentPageIdx]);

    // Glow policy:
    // - Can appear ONLY during a language switch.
    // - Even then, show it only if this page has zero ready translatable blocks
    //   (i.e. the whole page is still pending/blurred).
    const shouldShowGlow = useMemo(() => {
        if (!isLanguageSwitching) return false;
        if (!pagesReady || !visiblePagesReady) return false;
        if (!currentPageBlocks.length) return false;
        const translatable = currentPageBlocks.filter(isTranslatableBlock);
        if (translatable.length === 0) return false;
        const hasAnyReady = translatable.some((block) => {
            return !isBlockPendingForActiveLang(block, pendingBlockIds);
        });
        return !hasAnyReady;
    }, [isLanguageSwitching, pagesReady, visiblePagesReady, currentPageBlocks, pendingBlockIds]);

    useEffect(() => {
        setIsTranslatingForBook(bookId, shouldShowGlow);
    }, [bookId, shouldShowGlow, setIsTranslatingForBook]);

    // Consider language switching "done" once the switched-to page is readable:
    // - the correct language is loaded
    // - pagination/anchor applied
    // - and at least one translatable block is ready (or there are none).
    useEffect(() => {
        if (!isLanguageSwitching) return;
        if (isContentLoading) return;
        if (!blocksLang) return;
        if (blocksLang.toLowerCase() !== activeLang.toLowerCase()) return;
        if (!pagesReady || !visiblePagesReady) return;
        if (!currentPageBlocks.length) return;

        const translatable = currentPageBlocks.filter(isTranslatableBlock);
        if (translatable.length === 0) {
            setIsLanguageSwitching(false);
            return;
        }
        const hasAnyReady = translatable.some((block) => {
            return !isBlockPendingForActiveLang(block, pendingBlockIds);
        });
        if (hasAnyReady) setIsLanguageSwitching(false);
    }, [isLanguageSwitching, isContentLoading, blocksLang, activeLang, pagesReady, visiblePagesReady, currentPageBlocks, pendingBlockIds]);

    const currentPageBlocksRef = useRef<ContentBlock[]>([]);

    // Keep ref updated with current page blocks
    useEffect(() => {
        currentPageBlocksRef.current = currentPageBlocks;
    }, [currentPageBlocks]);

    const goToChapter = useCallback((index: number, options?: { targetPage?: 'start' | 'end' }) => {
        if (index >= 1 && index <= chapters.length) {
            // Save current anchor before switching chapters
            if (currentPageBlocksRef.current.length > 0) {
                const currentBlock = currentPageBlocksRef.current[0];
                const blockId = currentBlock.parentId ?? currentBlock.id;
                saveAnchor(blockId, currentBlock.position, getSentenceIndex(currentBlock), currentBlock.id);
            }

            pendingAnchorBlockId.current = options?.targetPage === 'end' ? LAST_PAGE_SENTINEL : null;
            pendingAnchorSentenceIndex.current = 0;

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
        if (block) saveAnchor(block.parentId ?? block.id, block.position, getSentenceIndex(block), block.id);
        // Translation enqueue is handled by the useEffect on currentPageIdx change.
        // No direct enqueue here to avoid double-enqueuing (which would cause an
        // unnecessary abort of the batch the useEffect just started).
    }, [pages, paginatedBlocks, saveAnchor]);

    const goToNextPage = useCallback(() => {
        if (currentPageIdx < pages.length - 1) {
            goToPage(currentPageIdx + 1);
            return;
        }
        if (currentChapterIndex < chapters.length) {
            goToChapter(currentChapterIndex + 1, { targetPage: 'start' });
        }
    }, [currentPageIdx, pages.length, goToPage, currentChapterIndex, chapters.length, goToChapter]);

    const goToPrevPage = useCallback(() => {
        if (currentPageIdx > 0) {
            goToPage(currentPageIdx - 1);
            return;
        }
        if (currentChapterIndex > 1) {
            goToChapter(currentChapterIndex - 1, { targetPage: 'end' });
        }
    }, [currentPageIdx, goToPage, currentChapterIndex, goToChapter]);

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
                    sentenceIndex: getSentenceIndex(block),
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
    }, [abortAll, currentChapter, displayBlocks, bookId, storeSetAnchor, pages, pagesReady, paginatedBlocks]);

    // TOC selects chapters (not blocks). Abort prefetch immediately, then switch chapter.
    const handleSelectChapterFromToc = useCallback((chapterIndex: number) => {
        navigateTo('', 'toc'); // abort + mark as jump; no in-chapter blockId yet
        goToChapter(chapterIndex);
    }, [navigateTo, goToChapter]);

    // ─── TOC open: translate chapter titles if needed ─────────────────────────
    const handleTocOpen = useCallback(async () => {
        const lang = activeLang.toUpperCase();
        if (isSourceLang || !chapters.length) return;
        // Skip if already translated or in progress for this lang
        if (translatingTitlesLangRef.current === lang) return;
        const missing = chapters.some((c) => c.title && !c.translations?.[lang]);
        if (!missing) return;

        translatingTitlesLangRef.current = lang;
        setIsTranslatingChapterTitles(true);
        try {
            const { results } = await translateChapterTitles(bookId, lang);
            const map = new Map<string, string>();
            for (const r of results) map.set(r.id, r.title);
            setTranslatedChapterTitles(map);
            const scopeKey = user?.id ?? 'guest';
            void setCachedTocTitles(scopeKey, bookId, lang, Object.fromEntries(map.entries()));
        } catch {
            // silently fail — original titles remain visible
        } finally {
            setIsTranslatingChapterTitles(false);
        }
    }, [activeLang, isSourceLang, chapters, bookId, user?.id]);

    // ─── Language switch (lock anchor before, restore after) ─────────────────
    const handleLanguageChange = (lang: Language) => {
        if (lang.toLowerCase() === activeLang.toLowerCase()) return;

        trackLanguageSwitched({ book_id: bookId, from_language: activeLang, to_language: lang });
        // Lock the current anchor so we can restore it after the language reloads
        if (pages.length > 0 && currentChapter) {
            const anchorBlockId = pages[currentPageIdx]?.[0];
            const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
            if (block) {
                const sentenceIndex = getSentenceIndex(block);
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
        
        setBookLanguage(bookId, lang);
        setPendingLang(lang);
        setIsLanguageSwitching(true);

        updateBookLanguage(bookId, lang)
            .then(() => {
                // local state was already updated optimistically
            })
            .catch(() => {
                // Only revert if the user hasn't switched to another language since
                setPendingLang((current) => {
                    if (current === lang) {
                        setBookLanguage(bookId, previousLang as Language);
                        return previousLang === resolvedServerLang ? null : previousLang;
                    }
                    return current;
                });
                setIsLanguageSwitching(false);
                pendingAnchorBlockId.current = null;
            });
    };

    const languages = availableLanguages
        .map((l) => l.toLowerCase())
        .filter((l): l is Language => ['en', 'fr', 'es', 'de', 'ru'].includes(l));

    const currentChapterFooterTitle = currentChapter
        ? translatedChapterTitles.get(currentChapter.id)
            || (activeLang && currentChapter.translations?.[activeLang.toUpperCase()])
            || currentChapter.title
        : `Ch. ${currentChapterIndex}`
    ;

    // ─── Chrome visibility (header + footer toggle) ───────────────────────────
    const [chromeVisible, setChromeVisible] = useState(true);

    const toggleChrome = useCallback(() => {
        setChromeVisible((v) => !v);
    }, []);

    // ─── Gesture handler ──────────────────────────────────────────────────────
    const allowInternalScroll = false;
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
                    <Button variant="ghost" size="icon" asChild className="text-[var(--system-blue)] -ml-2 flex-shrink-0 relative after:absolute after:inset-y-[-10px] after:left-[-10px] after:right-[-4px]">
                        <Link
                            href="/library"
                            onClick={() => {
                                try {
                                    sessionStorage.setItem(
                                        'globoox:last_read_book',
                                        JSON.stringify({ bookId, at: Date.now() })
                                    );
                                } catch { /* ignore */ }
                            }}
                        >
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
                                chapters: chapters.map((c) => ({
                                    number: c.index,
                                    title: translatedChapterTitles.get(c.id)
                                        || (activeLang && c.translations?.[activeLang.toUpperCase()])
                                        || c.title,
                                    depth: c.depth,
                                    isPending: isPendingChapterTitle(
                                        c.id,
                                        activeLang,
                                        originalLanguage,
                                        translatedChapterTitles,
                                    ),
                                })),
                            }}
                            currentChapter={currentChapterIndex}
                            onSelectChapter={handleSelectChapterFromToc}
                            disabled={false}
                            onTocOpen={handleTocOpen}
                            isTranslatingChapterTitles={isTranslatingChapterTitles}
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
                                className="flow-root"
                                data-measure-block-id={block.id}
                                ref={(el) => {
                                    if (el) blockMeasureRefs.current.set(block.id, el);
                                    else blockMeasureRefs.current.delete(block.id);
                                }}
                            >
                                <ContentBlockRenderer block={block} fontSize={settings.fontSize} coverUrl={coverUrl} isCoverImage={block.id === firstImageBlockId} />
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
                                        const isCoverImage = block.id === firstImageBlockId;
                                        // Skip image blocks that cannot be rendered to avoid empty divs in the DOM
                                        if (block.type === 'image') {
                                            const src = block.src;
                                            const isAbsolute = src?.startsWith('http://') || src?.startsWith('https://') || src?.startsWith('data:');
                                            if (!isAbsolute && !(isCoverImage && coverUrl)) return null;
                                        }
                                        const isPending = isBlockPendingForActiveLang(block, pendingBlockIds);
                                        const showTranslatingLabel = isPending && !firstPendingFound;
                                        if (isPending && !firstPendingFound) firstPendingFound = true;
                                        return (
                                            <div key={block.id} className="flow-root" ref={getRefCallback(blockId, block.type)}>
                                                <ContentBlockRenderer block={block} fontSize={settings.fontSize} isPending={isPending} showTranslatingLabel={showTranslatingLabel} coverUrl={coverUrl} isCoverImage={isCoverImage} />
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
                    disabled={currentPageIdx === 0 && currentChapterIndex === 1}
                    className="hidden md:flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
                >
                    <span className="truncate">← Previous page</span>
                </Button>

                <div className="min-w-0 max-w-[70vw] md:max-w-[50vw] flex items-center gap-2 text-center">
                    <span className="min-w-0 truncate text-center">
                        {currentChapterFooterTitle}
                    </span>
                    {pagesReady && displayBlocks.length > 0 && (
                        <span className="shrink-0 tabular-nums">
                            {blockProgressPct}%
                        </span>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPageIdx >= pages.length - 1 && currentChapterIndex === chapters.length}
                    className="hidden md:flex items-center gap-0.5 text-xs text-[var(--system-blue)] disabled:opacity-30 px-1"
                >
                    <span className="truncate">Next page →</span>
                </Button>
            </div>
        </div>
    );
}
