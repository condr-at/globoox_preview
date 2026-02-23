'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiBook, fetchBooks, createBook, updateBook, deleteBook as apiDeleteBook } from './api'

// Stale-while-revalidate cache for books
const STALE_TIME_MS = 60000 // 1 minute

interface CachedBooks {
  data: ApiBook[]
  fetchedAt: number
}

const booksCache = new Map<string, CachedBooks>()

export function useBooks() {
  const [books, setBooks] = useState<ApiBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)

  const refresh = useCallback(async (force = false) => {
    const cached = booksCache.get('all')
    const now = Date.now()

    // Return fresh cache immediately (unless force refresh)
    if (!force && cached && now - cached.fetchedAt < STALE_TIME_MS) {
      setBooks(cached.data)
      setIsStale(false)
      setLoading(false)
      return
    }

    // Invalidate cache on force refresh
    if (force) {
      booksCache.delete('all')
    }

    // Show stale data while revalidating
    if (cached && !force) {
      setBooks(cached.data)
      setIsStale(true)
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchBooks('active')
      booksCache.set('all', { data, fetchedAt: now })
      setBooks(data)
      setIsStale(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Revalidate on visibility change (when coming back to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isStale) {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isStale, refresh])

  const addBook = useCallback(async (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => {
    const created = await createBook(data)
    setBooks((prev) => [created, ...prev])
    // Invalidate cache
    booksCache.delete('all')
    return created
  }, [])

  const hideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'hidden' })
    setBooks((prev) => prev.filter((b) => b.id !== id))
    // Invalidate cache
    booksCache.delete('all')
  }, [])

  const unhideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'active' })
    await refresh()
  }, [refresh])

  const removeBook = useCallback(async (id: string) => {
    await apiDeleteBook(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
    // Invalidate cache
    booksCache.delete('all')
  }, [])

  return { books, loading, error, refresh, addBook, hideBook, unhideBook, removeBook, isStale }
}
