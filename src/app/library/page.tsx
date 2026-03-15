'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Check } from 'lucide-react';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
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
import { fetchReadingPosition, BookReadingProgress, ApiBook } from '@/lib/api';
import { getCachedReadingPosition } from '@/lib/contentCache';

const FALLBACK_COVER = '/covers/great-gatsby.jpg';
const FALLBACK_AUTHOR = 'Unknown author';

export default function LibraryPage() {
  const { progress, touchLastRead } = useAppStore();
  const syncProgressVersion = useAppStore((s) => s.syncVersions.progress);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const scopeKey = isAuthenticated && user?.id ? user.id : 'guest';
  const { books, loading, error, hideBook, removeBook, refresh } = useBooks({ scopeKey });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [progressData, setProgressData] = useState<Record<string, BookReadingProgress>>({});
  const [progressFetchedOnce, setProgressFetchedOnce] = useState(false);
  const [justReadBookId, setJustReadBookId] = useState<string | null>(null);
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
    try {
      const raw = sessionStorage.getItem('globoox:last_read_book');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { bookId?: string; at?: number };
      if (parsed?.bookId && typeof parsed.at === 'number' && Date.now() - parsed.at < 5 * 60 * 1000) {
        setJustReadBookId(parsed.bookId);
      }
      sessionStorage.removeItem('globoox:last_read_book');
    } catch {
      // ignore
    }
  }, []);

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
      window.history.replaceState({}, '', '/library');
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

  // Fetch reading positions for all books (authenticated users only)
  const fetchAllProgress = useCallback(async (bookIds: string[]) => {
    if (!isAuthenticated || bookIds.length === 0) return;

    try {
      const results = await Promise.allSettled(
        bookIds.map(id => fetchReadingPosition(id))
      );

      const progressMap: Record<string, BookReadingProgress> = {};
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          const bookId = bookIds[idx];
          // Use server value if present, otherwise fallback to local store (Fix #5)
          const totalBlocks = data.total_blocks || progress[bookId]?.totalBlocks || 0;

          progressMap[bookId] = {
            book_id: data.book_id,
            chapter_id: data.chapter_id,
            block_id: data.block_id,
            block_position: data.block_position,
            total_blocks: totalBlocks,
            content_version: 0,
            updated_at: data.updated_at,
          };
        }
      });

      setProgressData(progressMap);
    } finally {
      setProgressFetchedOnce(true);
    }
  }, [isAuthenticated, progress]);

  // Hydrate server reading positions from IndexedDB on load to avoid N requests on refresh.
  useEffect(() => {
    if (!isAuthenticated) {
      setProgressFetchedOnce(true);
      return;
    }

    if (books.length === 0) {
      setProgressData({});
      setProgressFetchedOnce(false);
      return;
    }

    let cancelled = false;
    setProgressFetchedOnce(false);
    void (async () => {
      const entries = await Promise.all(
        books.map(async (b) => {
          const cached = await getCachedReadingPosition(scopeKey, b.id);
          return [b.id, cached?.position ?? null] as const;
        })
      );

      if (cancelled) return;

      const progressMap: Record<string, BookReadingProgress> = {};
      for (const [bookId, pos] of entries) {
        if (!pos) continue;
        progressMap[bookId] = {
          book_id: pos.book_id,
          chapter_id: pos.chapter_id,
          block_id: pos.block_id,
          block_position: pos.block_position,
          total_blocks: pos.total_blocks ?? progress[bookId]?.totalBlocks ?? 0,
          content_version: 0,
          updated_at: pos.updated_at,
        };
      }
      setProgressData(progressMap);
      setProgressFetchedOnce(true);
    })();

    return () => { cancelled = true; };
  }, [books, isAuthenticated, scopeKey, progress]);

  // Only revalidate server reading positions when sync-check indicates progress changed.
  const lastSyncProgressVersionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!syncProgressVersion) return;
    if (lastSyncProgressVersionRef.current === syncProgressVersion) return;
    lastSyncProgressVersionRef.current = syncProgressVersion;
    if (books.length === 0) return;
    void fetchAllProgress(books.map((b) => b.id));
  }, [isAuthenticated, syncProgressVersion, books, fetchAllProgress]);

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

  // Get last read entry sorted by server updated_at
  const lastReadEntry = useMemo(() => {
    if (!isAuthenticated) {
      // For guests, use local lastRead
      return Object.entries(progress).sort(
        (a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime()
      )[0];
    }

    // If user just opened a book, prefer it (even after server progress fetch) so Continue Reading feels instant.
    if (justReadBookId && progress[justReadBookId]) {
      const lastReadAt = new Date(progress[justReadBookId].lastRead).getTime();
      if (Number.isFinite(lastReadAt) && Date.now() - lastReadAt < 5 * 60 * 1000) {
        return [justReadBookId, progress[justReadBookId]];
      }
    }

    // Before the first server progress fetch completes, prefer a recent local "just read" book to avoid hiding the section.
    if (!progressFetchedOnce) {
      const local = Object.entries(progress).sort(
        (a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime()
      )[0];
      if (local) {
        const lastReadAt = new Date(local[1].lastRead).getTime();
        if (Number.isFinite(lastReadAt) && Date.now() - lastReadAt < 5 * 60 * 1000) return local;
      }

      return undefined;
    }

    // First try server updated_at
    const serverEntries = Object.entries(progressData)
      .filter(([, data]) => data.updated_at != null)
      .sort((a, b) =>
        new Date(b[1].updated_at!).getTime() - new Date(a[1].updated_at!).getTime()
      );

    if (serverEntries.length > 0) {
      return serverEntries[0];
    }

    // Fallback to local lastRead
    return Object.entries(progress).sort(
      (a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime()
    )[0];
  }, [progressData, progress, isAuthenticated, progressFetchedOnce, justReadBookId]);

  const filteredBooks = useMemo(() => {
    const filtered = statusFilter === 'hidden'
      ? books.filter((b) => b.status === 'hidden')
      : statusFilter === 'all'
        ? books
        : books.filter((b) => b.status !== 'hidden');

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title);
      if (sortOrder === 'title_desc') return b.title.localeCompare(a.title);
      if (sortOrder === 'recently_opened') {
        const aTime = progressData[a.id]?.updated_at ?? progress[a.id]?.lastRead ?? '';
        const bTime = progressData[b.id]?.updated_at ?? progress[b.id]?.lastRead ?? '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      // recently_added
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [books, statusFilter, sortOrder, progressData, progress]);

      const lastBook = lastReadEntry ? filteredBooks.find((b) => b.id === lastReadEntry[0]) : null;

  return (
    <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
      <GoogleOneTap />
      <PageHeader
        title="Library"
        action={{ label: 'Add', onClick: handleUploadClick }}
      />

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top)+72px)] pb-4 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-2">
          {(['visible', 'hidden', 'all'] as const).map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="rounded-full"
            >
              {f === 'visible' ? 'Visible' : f === 'hidden' ? 'Hidden' : 'All'}
            </Button>
          ))}
          <button
            ref={sortTriggerRef}
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                setSortDrawerOpen(true);
              } else {
                setSortDropdownOpen((v) => !v);
              }
            }}
            className="ml-auto flex items-center justify-center w-9 h-9 rounded-full text-[var(--system-blue)] active:opacity-60 transition-opacity"
            aria-label="Sort"
          >
            <ArrowUpDown className="w-[18px] h-[18px]" />
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
                { value: 'recently_opened', label: 'Recently Opened' },
                { value: 'title_asc', label: 'Title A → Z' },
                { value: 'title_desc', label: 'Title Z → A' },
              ] as const).map(({ value, label }, i, arr) => (
                <div key={value}>
                  <button
                    onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDropdownOpen(false); }}
                    className="w-full flex items-center justify-between px-[16px] py-[12px] text-left transition-colors active:bg-[var(--fill-tertiary)]"
                  >
                    <span className="text-[17px]">{label}</span>
                    {sortOrder === value && <Check className="w-[18px] h-[18px] text-[var(--system-blue)]" />}
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--separator)]" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {false && lastBook && lastReadEntry && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Continue Reading</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <BookCard
                id={lastBook.id}
                title={lastBook.title}
                author={lastBook.author ?? FALLBACK_AUTHOR}
                cover={lastBook.cover_url ?? FALLBACK_COVER}
                progress={getBookProgress(lastBook)}
                onHide={hideBook}
                onDelete={handleRequestDelete}
                hideLabel="Hide"
                onOpen={() => {
                  touchLastRead(lastBook.id);
                  trackBookOpened({ book_id: lastBook.id, title: lastBook.title, source: 'library' });
                }}
              />
            </div>
          </section>
        )}

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
                  onHide={hideBook}
                  onDelete={handleRequestDelete}
                  hideLabel="Hide"
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
            { value: 'recently_opened', label: 'Recently Opened' },
            { value: 'title_asc', label: 'Title A → Z' },
            { value: 'title_desc', label: 'Title Z → A' },
          ] as const).map(({ value, label }, i, arr) => (
            <button
              key={value}
              onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDrawerOpen(false); }}
              className={[
                'flex w-full items-center justify-between px-5 h-[52px] text-[17px] text-left active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors',
                i < arr.length - 1 ? 'border-b border-[var(--separator)]' : '',
              ].join(' ')}
            >
              <span>{label}</span>
              {sortOrder === value && <Check className="w-[18px] h-[18px] text-[var(--system-blue)]" />}
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
