'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, SlidersHorizontal } from 'lucide-react';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import {
  uiDrawerItemButton,
  uiDropdownItemButton,
  uiFilterPillActive,
  uiFilterPillBase,
  uiFilterPillInactive,
  uiTextActionButton,
  uiTextActionButtonPressed,
} from '@/components/ui/button-styles';
import BookCard from '@/components/Store/BookCard';
import DeleteBookConfirmDialog from '@/components/Store/DeleteBookConfirmDialog';
import UploadBookModal from '@/components/UploadBookModal';
import SignInToUploadModal from '@/components/SignInToUploadModal';
import { useAppStore } from '@/lib/store';
import { useBooks } from '@/lib/useBooks';
import { useAuth } from '@/lib/hooks/useAuth';
import GoogleOneTap from '@/components/GoogleOneTap';
import PageHeader from '@/components/ui/PageHeader';
import { trackBookOpened } from '@/lib/posthog';
import { BookReadingProgress, ApiBook, fetchReadingPosition } from '@/lib/api';
import { getCachedReadingPosition, setCachedReadingPosition } from '@/lib/contentCache';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';
const FALLBACK_AUTHOR = 'Unknown author';

type ProgressRow = BookReadingProgress & {
  server_updated_at?: string | null;
  idb_updated_at?: string | null;
};

function toMs(ts: string | null | undefined): number {
  if (!ts) return Number.NEGATIVE_INFINITY;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

function chooseNewestTs(...candidates: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const ts of candidates) {
    const ms = toMs(ts);
    if (ms > bestMs) {
      best = ts ?? null;
      bestMs = ms;
    }
  }
  return best;
}

function chooseByPriority(...candidates: Array<string | null | undefined>): string | null {
  for (const ts of candidates) {
    if (!ts) continue;
    if (Number.isFinite(toMs(ts))) return ts;
  }
  return null;
}

function mergeProgressMonotonic(existing: ProgressRow | undefined, incoming: ProgressRow): ProgressRow {
  if (!existing) {
    const normalizedUpdated = chooseNewestTs(
      incoming.server_updated_at,
      incoming.idb_updated_at,
      incoming.updated_at,
    );
    return {
      ...incoming,
      updated_at: normalizedUpdated,
      server_updated_at: incoming.server_updated_at ?? incoming.updated_at ?? null,
      idb_updated_at: incoming.idb_updated_at ?? incoming.updated_at ?? null,
    };
  }

  const serverUpdated = chooseNewestTs(existing.server_updated_at, incoming.server_updated_at);
  const idbUpdated = chooseNewestTs(existing.idb_updated_at, incoming.idb_updated_at);
  const effectiveUpdated = chooseNewestTs(serverUpdated, idbUpdated, existing.updated_at, incoming.updated_at);

  const useIncomingBlockData = toMs(incoming.updated_at) >= toMs(existing.updated_at);
  const source = useIncomingBlockData ? incoming : existing;

  return {
    ...source,
    server_updated_at: serverUpdated,
    idb_updated_at: idbUpdated,
    updated_at: effectiveUpdated,
  };
}

export default function MyBooksPage() {
  const { progress, touchLastRead, updateServerProgress, syncVersions } = useAppStore();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const scopeKey = isAuthenticated && user?.id ? user.id : 'guest';
  const { books, loading, error, hideBook, unhideBook, removeBook, refresh } = useBooks({ scopeKey });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [progressData, setProgressData] = useState<Record<string, ProgressRow>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'visible' | 'hidden' | 'all'>('visible');
  const SORT_STORAGE_KEY = 'globoox:library_sort';
  const [sortOrder, setSortOrder] = useState<'title_asc' | 'title_desc' | 'recently_added' | 'recently_opened'>(() => {
    if (typeof window === 'undefined') return 'recently_opened';
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return (saved as 'title_asc' | 'title_desc' | 'recently_added' | 'recently_opened') || 'recently_opened';
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen: sortDropdownOpen,
    setIsOpen: setSortDropdownOpen,
    triggerRef: sortTriggerRef,
    menuRef: sortMenuRef,
    menuWidth: 200,
    menuHeight: 220,
  });

  useEffect(() => {
    document.documentElement.classList.add('library-scroll-lock-x');
    document.body.classList.add('library-scroll-lock-x');
    return () => {
      document.documentElement.classList.remove('library-scroll-lock-x');
      document.body.classList.remove('library-scroll-lock-x');
    };
  }, []);

  // After OAuth redirect back with ?upload=1, auto-open upload modal
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upload') === '1') {
      setIsUploadOpen(true);
      window.history.replaceState({}, '', '/my-books');
    }
  }, [authLoading, isAuthenticated]);

  const handleUploadClick = () => {
    if (isAuthenticated) {
      setIsUploadOpen(true);
    } else {
      setIsSignInOpen(true);
    }
  };

  const handleRequestDelete = useCallback((bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);
    if (!book) return;
    setDeleteTarget({ id: book.id, title: book.title });
  }, [books]);

  const handleCancelDelete = useCallback(() => {
    if (isDeletingBook) return;
    setDeleteTarget(null);
  }, [isDeletingBook]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeletingBook(true);
    const targetId = deleteTarget.id;
    try {
      setDeleteTarget(null);
      await removeBook(targetId);
    } catch {
      // useBooks already restores the removed book and exposes the error to the page
    } finally {
      setIsDeletingBook(false);
    }
  }, [deleteTarget, removeBook]);

  // Hydrate server reading positions from IndexedDB on load to avoid N requests on refresh.
  useEffect(() => {
    if (books.length === 0) {
      setProgressData({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        books.map(async (b) => {
          const cached = await getCachedReadingPosition(scopeKey, b.id);
          return [b.id, cached] as const;
        })
      );

      if (cancelled) return;

      const progressMap: Record<string, ProgressRow> = {};
      for (const [bookId, cached] of entries) {
        if (!cached) continue;
        const pos = cached.position;
        const effectiveUpdatedAt = chooseNewestTs(pos.updated_at, cached.updatedAt);
        progressMap[bookId] = {
          book_id: pos.book_id,
          chapter_id: pos.chapter_id,
          block_id: pos.block_id,
          block_position: pos.block_position,
          total_blocks: pos.total_blocks ?? progressRef.current[bookId]?.totalBlocks ?? 0,
          content_version: 0,
          updated_at: effectiveUpdatedAt,
          server_updated_at: pos.updated_at ?? null,
          idb_updated_at: cached.updatedAt ?? null,
        };
      }
      setProgressData((prev) => {
        const next = { ...prev };
        for (const [bookId, incoming] of Object.entries(progressMap)) {
          next[bookId] = mergeProgressMonotonic(prev[bookId], incoming);
        }
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [books, scopeKey]);

  // Revalidate reading positions from server so Recently Read is consistent cross-device.
  useEffect(() => {
    if (!isAuthenticated || books.length === 0) return;

    let cancelled = false;
    void (async () => {
      const updates: Array<{ bookId: string; remote: Awaited<ReturnType<typeof fetchReadingPosition>> } | null> = [];
      const CONCURRENCY = 4;
      for (let i = 0; i < books.length && !cancelled; i += CONCURRENCY) {
        const batch = books.slice(i, i + CONCURRENCY);
        const batchUpdates = await Promise.all(
          batch.map(async (book) => {
            try {
              const remote = await fetchReadingPosition(book.id);
              void setCachedReadingPosition(scopeKey, book.id, { position: remote, updatedAt: remote.updated_at ?? null });
              return { bookId: book.id, remote };
            } catch {
              return null;
            }
          })
        );
        updates.push(...batchUpdates);
      }

      if (cancelled) return;

      const serverUpdates: Array<{
        bookId: string;
        blockPosition?: number;
        totalBlocks?: number;
        serverUpdatedAt: string;
      }> = [];

      setProgressData((prev) => {
        const next = { ...prev };
        for (const item of updates) {
          if (!item) continue;
          const { bookId, remote } = item;
          if (!remote.chapter_id) continue;
          const totalBlocks = prev[bookId]?.total_blocks ?? progressRef.current[bookId]?.totalBlocks ?? 0;
          const incoming: ProgressRow = {
            book_id: remote.book_id,
            chapter_id: remote.chapter_id,
            block_id: remote.block_id,
            block_position: remote.block_position,
            total_blocks: totalBlocks,
            content_version: 0,
            updated_at: remote.updated_at,
            server_updated_at: remote.updated_at,
            idb_updated_at: remote.updated_at,
          };
          next[bookId] = mergeProgressMonotonic(prev[bookId], incoming);
          const currentServerTs = progressRef.current[bookId]?.serverUpdatedAt;
          if (remote.updated_at && currentServerTs !== remote.updated_at) {
            serverUpdates.push({
              bookId,
              blockPosition: remote.block_position ?? undefined,
              totalBlocks,
              serverUpdatedAt: remote.updated_at,
            });
          }
        }
        return next;
      });

      for (const update of serverUpdates) {
        updateServerProgress(update.bookId, {
          blockPosition: update.blockPosition,
          totalBlocks: update.totalBlocks,
          serverUpdatedAt: update.serverUpdatedAt,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [books, isAuthenticated, scopeKey, syncVersions.progress, updateServerProgress]);

  // Get block-based progress for a book
  const getBookProgress = useCallback((book: ApiBook) => {
    const local = progress[book.id];
    const server = progressData[book.id];

    // Priority: server data, fallback to local
    const blockPosition = server?.block_position ?? local?.blockPosition;
    const totalBlocks = server?.total_blocks ?? local?.totalBlocks;

    if (totalBlocks && totalBlocks > 0 && blockPosition != null) {
      return Math.min(100, Math.round((blockPosition / totalBlocks) * 100));
    }

    return 0;
  }, [progress, progressData]);

  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const getEffectiveLastRead = useCallback((bookId: string) => {
    const p = progressData[bookId];
    return chooseByPriority(
      p?.server_updated_at,
      p?.idb_updated_at,
      progress[bookId]?.lastRead ?? null,
    );
  }, [progressData, progress]);

  const filteredBooks = useMemo(() => {
    const filtered = statusFilter === 'hidden'
      ? books.filter((b) => b.status === 'hidden')
      : statusFilter === 'all'
        ? books
        : books.filter((b) => b.status !== 'hidden');

    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title);
      if (sortOrder === 'title_desc') return b.title.localeCompare(a.title);
      if (sortOrder === 'recently_opened') {
        const aMs = toMs(getEffectiveLastRead(a.id));
        const bMs = toMs(getEffectiveLastRead(b.id));
        if (bMs !== aMs) return bMs - aMs;
        return a.id.localeCompare(b.id);
      }
      // recently_added
      const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    });

    return sorted;
  }, [books, statusFilter, sortOrder, getEffectiveLastRead]);

  return (
    <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
      <GoogleOneTap />
      <PageHeader
        title="My Books"
        action={{ label: 'Add', onClick: handleUploadClick }}
      />

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top)+72px)] pb-4 space-y-6 overflow-x-clip">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2 relative">
          <div className="relative hidden max-[395px]:block">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen((v) => !v)}
              className={[
                `${uiTextActionButton} flex items-center gap-[6px] px-[12px] min-h-[40px] rounded-full border text-[14px] font-medium`,
                filterDropdownOpen
                  ? `border-[var(--separator)] text-foreground ${uiTextActionButtonPressed}`
                  : 'border-[var(--separator)] bg-background text-foreground',
              ].join(' ')}
              aria-label="Filter"
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.8} />
              <span>
                {statusFilter === 'visible' ? 'Visible' : statusFilter === 'hidden' ? 'Hidden' : 'All'}
              </span>
            </button>

            {filterDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] py-[8px] w-[180px] bg-[var(--bg-grouped-secondary)] rounded-[12px] shadow-lg border border-[var(--separator)] overflow-hidden z-[100]">
                {([
                  { value: 'visible', label: 'Visible' },
                  { value: 'hidden', label: 'Hidden' },
                  { value: 'all', label: 'All' },
                ] as const).map(({ value, label }, i, arr) => (
                  <div key={value}>
                    <button
                      onClick={() => { setStatusFilter(value); setFilterDropdownOpen(false); }}
                      className={uiDropdownItemButton}
                    >
                      <span className="text-[17px]">{label}</span>
                      {statusFilter === value && <Check className="w-[18px] h-[18px] text-primary" />}
                    </button>
                    {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--separator)]" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(['visible', 'hidden', 'all'] as const).map((f) => (
            <Button
              key={f}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(f)}
              className={[
                `${uiFilterPillBase} max-[395px]:hidden`,
                statusFilter === f
                  ? uiFilterPillActive
                  : uiFilterPillInactive,
              ].join(' ')}
            >
              {f === 'visible' ? 'Visible' : f === 'hidden' ? 'Hidden' : 'All'}
            </Button>
          ))}
          <button
            ref={sortTriggerRef}
            onClick={() => {
              setFilterDropdownOpen(false);
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                setSortDrawerOpen(true);
              } else {
                setSortDropdownOpen((v) => !v);
              }
            }}
            className={`${uiTextActionButton} ml-auto relative flex items-center justify-end text-right gap-[4px] px-[8px] min-h-[44px] after:absolute after:inset-y-[-10px] after:left-[-4px] after:right-0`}
            aria-label="Sort"
          >
            <span className="text-[15px] font-medium">
              {sortOrder === 'recently_opened' ? 'Recently Read' : sortOrder === 'recently_added' ? 'Recently Added' : sortOrder === 'title_asc' ? 'Title A→Z' : 'Title Z→A'}
            </span>
            <ChevronDown className={`w-[16px] h-[16px] transition-transform ${sortDropdownOpen || sortDrawerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Desktop dropdown */}
          {sortDropdownOpen && (
            <div
              ref={sortMenuRef}
              className="fixed py-[8px] w-[200px] bg-[var(--bg-grouped-secondary)] rounded-[12px] shadow-lg border border-[var(--separator)] overflow-hidden z-[100]"
              style={{ ...menuStyle, visibility: isPositioned ? 'visible' : 'hidden' }}
            >
              {([
                { value: 'recently_added', label: 'Recently Added' },
                { value: 'recently_opened', label: 'Recently Read' },
                { value: 'title_asc', label: 'Title A → Z' },
                { value: 'title_desc', label: 'Title Z → A' },
              ] as const).map(({ value, label }, i, arr) => (
                <div key={value}>
                  <button
                    onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDropdownOpen(false); }}
                    className={uiDropdownItemButton}
                  >
                    <span className="text-[17px]">{label}</span>
                    {sortOrder === value && <Check className="w-[18px] h-[18px] text-primary" />}
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--separator)]" />}
                </div>
              ))}
            </div>
          )}
        </div>


        <section>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author ?? FALLBACK_AUTHOR}
                  cover={book.cover_url ?? FALLBACK_COVER}
                  progress={getBookProgress(book)}
                  onHide={book.status === 'hidden' ? unhideBook : hideBook}
                  onDelete={handleRequestDelete}
                  hideLabel={book.status === 'hidden' ? 'Unhide' : 'Hide'}
                  onOpen={() => {
                    touchLastRead(book.id);
                    trackBookOpened({ book_id: book.id, title: book.title, source: 'library' });
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="container max-w-2xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground">
        Need help?{' '}
        <a href="mailto:support@globoox.co" className="underline underline-offset-2 hover:text-foreground transition-colors">
          support@globoox.co
        </a>
      </footer>

      {/* Mobile bottom drawer */}
      <IOSBottomDrawer
        open={sortDrawerOpen}
        onOpenChange={setSortDrawerOpen}
        enableDragDismiss
        dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
        dragRegion={<IOSBottomDrawerHeader title="Sort by" onClose={() => setSortDrawerOpen(false)} />}
      >
        <div className="pb-2">
          {([
            { value: 'recently_added', label: 'Recently Added' },
            { value: 'recently_opened', label: 'Recently Read' },
            { value: 'title_asc', label: 'Title A → Z' },
            { value: 'title_desc', label: 'Title Z → A' },
          ] as const).map(({ value, label }, i, arr) => (
            <button
              key={value}
              onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDrawerOpen(false); }}
              className={[
                uiDrawerItemButton,
                i < arr.length - 1 ? 'border-b border-[var(--separator)]' : '',
              ].join(' ')}
            >
              <span>{label}</span>
              {sortOrder === value && <Check className="w-[18px] h-[18px] text-primary" />}
            </button>
          ))}
        </div>
      </IOSBottomDrawer>

      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => refresh(true)}
      />

      <SignInToUploadModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />

      <DeleteBookConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        deleting={isDeletingBook}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
