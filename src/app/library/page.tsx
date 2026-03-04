'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BookCard from '@/components/Store/BookCard';
import UploadBookModal from '@/components/UploadBookModal';
import SignInToUploadModal from '@/components/SignInToUploadModal';
import { useAppStore } from '@/lib/store';
import { useBooks } from '@/lib/useBooks';
import { useAuth } from '@/lib/hooks/useAuth';
import GoogleOneTap from '@/components/GoogleOneTap';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [justReadBookId, setJustReadBookId] = useState<string | null>(null);

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

  // Collapse header past 60px, expand when back under 20px
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 60) setIsCollapsed(true);
      else if (y < 20) setIsCollapsed(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  const lastBook = lastReadEntry ? books.find((b) => b.id === lastReadEntry[0]) : null;

  return (
    <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
      <GoogleOneTap />
      <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 transition-[padding] duration-300 ease-in-out" style={{ paddingTop: isCollapsed ? 8 : 16, paddingBottom: isCollapsed ? 8 : 16 }}>
          <h1 className={`font-medium transition-[font-size,line-height] duration-300 ease-in-out -mt-1 ${isCollapsed ? 'text-base' : 'text-2xl'}`}>Library</h1>
          <button
            onClick={handleUploadClick}
            className="text-[15px] font-medium text-[var(--system-blue)] active:opacity-50 transition-[opacity,transform] duration-300 ease-in-out px-2 py-2"
            style={{
              opacity: isCollapsed ? 0 : 1,
              transform: isCollapsed ? 'scale(0)' : 'scale(1)',
              pointerEvents: isCollapsed ? 'none' : 'auto',
            }}
            tabIndex={isCollapsed ? -1 : 0}
          >
            Add
          </button>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {lastBook && lastReadEntry && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Continue Reading</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <BookCard
                id={lastBook.id}
                title={lastBook.title}
                author={lastBook.author ?? FALLBACK_AUTHOR}
                cover={lastBook.cover_url ?? FALLBACK_COVER}
                progress={getBookProgress(lastBook)}
                onHide={hideBook}
                onDelete={removeBook}
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
          <h2 className="text-lg font-semibold mb-4">All Books</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author ?? FALLBACK_AUTHOR}
                  cover={book.cover_url ?? FALLBACK_COVER}
                  progress={getBookProgress(book)}
                  onHide={hideBook}
                  onDelete={removeBook}
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

      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => refresh(true)}
      />

      <SignInToUploadModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />
    </div>
  );
}
