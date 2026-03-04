'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiBook, fetchBooks, createBook, updateBook, deleteBook as apiDeleteBook } from './api'
import { clearCachedBookMeta, clearCachedBooksList, getCachedBooksList, setCachedBookMeta, setCachedBooksList } from './contentCache'

// Stale-While-Revalidate cache — module-level so it survives component remounts (route navigation)
const STALE_TIME_MS = 5 * 60 * 1000 // 5 minutes — background refresh only if older

interface CachedBooks {
  data: ApiBook[]
  fetchedAt: number
}

const booksCache = new Map<string, CachedBooks>()

/** Expose a way for useSyncCheck to force-invalidate the cache from outside the hook */
export function invalidateBooksCache() {
  booksCache.delete('all')
  // Also drop persisted cache so a post-sync reload doesn't resurrect stale data.
  void clearCachedBooksList()
  void clearCachedBookMeta()
}

export function useBooks(options?: { scopeKey?: string }) {
  const scopeKey = options?.scopeKey ?? 'guest'

  // Initialise from cache immediately — no skeleton on repeated visits
  const cached = booksCache.get('all')
  const [books, setBooks] = useState<ApiBook[]>(cached?.data ?? [])
  // loading=true only when there is absolutely no cached data yet (very first visit)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)
  const revalidating = useRef(false)

  // Hydrate from persisted IndexedDB cache (fast reloads)
  useEffect(() => {
    let cancelled = false
    if (booksCache.get('all')) return

    void getCachedBooksList(scopeKey, 'active').then((entry) => {
      if (cancelled) return
      if (!entry?.books?.length) return
      booksCache.set('all', { data: entry.books, fetchedAt: entry.fetchedAt })
      setBooks(entry.books)
      setLoading(false)
      // Persist per-book metadata too, so /reader/[id] can render instantly on reload.
      entry.books.forEach((b) => void setCachedBookMeta(scopeKey, b))
    })

    return () => {
      cancelled = true
    }
  }, [scopeKey])

  /**
   * refresh(force=false) — stale-while-revalidate:
   *   - Always shows existing cached data immediately (no skeletons)
   *   - Fetches in background when cache is older than STALE_TIME_MS
   *   - force=true: always re-fetches (e.g. after mutating the list)
   */
  const refresh = useCallback(async (force = false) => {
    const entry = booksCache.get('all')
    const now = Date.now()
    const isFresh = entry && now - entry.fetchedAt < STALE_TIME_MS

    // Show cached data instantly — never block the user with a spinner
    if (entry) {
      setBooks(entry.data)
      setLoading(false)
    }

    // Nothing to do if cache is fresh and not forced
    if (!force && isFresh) return

    // Prevent concurrent fetches
    if (revalidating.current) return
    revalidating.current = true

    // Clear stale entry when forced so we don't risk showing it again on next mount
    if (force) booksCache.delete('all')

    setError(null)
    // Don't set loading=true here — we already have data to show
    try {
      const data = await fetchBooks('active')
      booksCache.set('all', { data, fetchedAt: Date.now() })
      setBooks(data)
      void setCachedBooksList(scopeKey, 'active', data)
      data.forEach((b) => void setCachedBookMeta(scopeKey, b))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load books'
      setError(message)
    } finally {
      revalidating.current = false
      // Only clear the initial loading spinner (first ever load)
      setLoading(false)
    }
  }, [scopeKey])

  // On mount: show cache immediately, revalidate if stale
  useEffect(() => {
    void refresh()
  }, [refresh])

  // On tab focus: silent background revalidation (no skeleton)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const addBook = useCallback(async (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => {
    const created = await createBook(data)
    setBooks((prev) => [created, ...prev])
    booksCache.delete('all')
    void setCachedBookMeta(scopeKey, created)
    return created
  }, [scopeKey])

  const hideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'hidden' })
    setBooks((prev) => prev.filter((b) => b.id !== id))
    booksCache.delete('all')
    // Leave IDB cache as-is; next refresh(force=true) will overwrite.
  }, [])

  const unhideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'active' })
    await refresh(true)
  }, [refresh])

  const removeBook = useCallback(async (id: string) => {
    await apiDeleteBook(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
    booksCache.delete('all')
    // Leave IDB cache as-is; next refresh(force=true) will overwrite.
  }, [])

  return { books, loading, error, refresh, addBook, hideBook, unhideBook, removeBook }
}
