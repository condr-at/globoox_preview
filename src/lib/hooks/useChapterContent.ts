'use client'

import { useEffect, useRef, useState } from 'react'
import { ContentBlock, fetchContent } from '@/lib/api'

export function useChapterContent(chapterId: string | null, lang?: string) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track which lang the current blocks were fetched for
  const [blocksLang, setBlocksLang] = useState<string | undefined>(undefined)
  
  // AbortController to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!chapterId) return
    
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    setLoading(true)
    setError(null)
    
    fetchContent(chapterId, lang, controller.signal)
      .then((data) => {
        // Only update state if this request wasn't aborted
        if (!controller.signal.aborted) {
          setBlocks(data)
          setBlocksLang(lang)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load content')
          setLoading(false)
        }
      })
    
    return () => {
      controller.abort()
    }
  }, [chapterId, lang])

  // Blocks are stale if they were fetched for a different language
  const isStale = blocksLang !== lang

  return { blocks, setBlocks, loading, error, isStale, blocksLang }
}
