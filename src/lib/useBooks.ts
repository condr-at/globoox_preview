'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiBook, fetchBooks, createBook, updateBook, deleteBook as apiDeleteBook } from './api'

export function useBooks() {
  const [books, setBooks] = useState<ApiBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBooks('active')
      setBooks(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addBook = useCallback(async (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => {
    const created = await createBook(data)
    setBooks((prev) => [created, ...prev])
    return created
  }, [])

  const hideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'hidden' })
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const unhideBook = useCallback(async (id: string) => {
    await updateBook(id, { status: 'active' })
    await refresh()
  }, [refresh])

  const removeBook = useCallback(async (id: string) => {
    await apiDeleteBook(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { books, loading, error, refresh, addBook, hideBook, unhideBook, removeBook }
}
