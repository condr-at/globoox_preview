'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiChapter, fetchChapters } from '@/lib/api'

export function useChapters(bookId: string | null) {
  const [chapters, setChapters] = useState<ApiChapter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!bookId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchChapters(bookId)
      setChapters(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load chapters')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    load()
  }, [load])

  return { chapters, loading, error }
}
