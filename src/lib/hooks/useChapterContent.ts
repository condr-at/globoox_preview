'use client'

import { useCallback, useEffect, useState } from 'react'
import { ContentBlock, fetchContent } from '@/lib/api'

export function useChapterContent(chapterId: string | null, lang?: string) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!chapterId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchContent(chapterId, lang)
      setBlocks(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [chapterId, lang])

  useEffect(() => {
    load()
  }, [load])

  return { blocks, loading, error }
}
