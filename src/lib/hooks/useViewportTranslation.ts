'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ContentBlock, translateBlocks } from '@/lib/api'

interface UseViewportTranslationOptions {
  chapterId: string | null
  lang: string
  blocks: ContentBlock[]
  sourceLanguage: string | null
  onBlocksTranslated: (translated: ContentBlock[]) => void
}

const DEBOUNCE_MS = 100
const ROOT_MARGIN = '50% 0px'
const MAX_BATCH_SIZE = 10

// Block types that don't need translation
const SKIP_TYPES = new Set(['image', 'hr'])

export function useViewportTranslation({
  chapterId,
  lang,
  blocks,
  sourceLanguage,
  onBlocksTranslated,
}: UseViewportTranslationOptions) {
  const [isTranslatingAny, setIsTranslatingAny] = useState(false)

  // Tracking sets (use refs to avoid re-renders)
  const translatedIds = useRef(new Set<string>())
  const pendingIds = useRef(new Set<string>())
  const inflightIds = useRef(new Set<string>())
  const isInflight = useRef(false)

  // Queue for next batch while one is in-flight
  const queuedIds = useRef(new Set<string>())

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for latest values (avoid stale closures)
  const chapterIdRef = useRef(chapterId)
  const langRef = useRef(lang)
  const onBlocksTranslatedRef = useRef(onBlocksTranslated)

  chapterIdRef.current = chapterId
  langRef.current = lang
  onBlocksTranslatedRef.current = onBlocksTranslated

  // Element refs map: blockId -> DOM element
  const elementRefs = useRef(new Map<string, HTMLElement>())

  // Observer ref
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Reset all tracking when lang or chapterId changes
  useEffect(() => {
    translatedIds.current.clear()
    pendingIds.current.clear()
    inflightIds.current.clear()
    queuedIds.current.clear()
    isInflight.current = false
    setIsTranslatingAny(false)

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
  }, [lang, chapterId])

  // Check if translation is needed (not source language)
  const isSourceLang = sourceLanguage
    ? sourceLanguage.toUpperCase() === lang.toUpperCase()
    : false

  // Flush pending IDs: send a translation request
  const flushPending = useCallback(async () => {
    if (!chapterIdRef.current || isInflight.current) return

    const allPending = Array.from(pendingIds.current)
    if (allPending.length === 0) return

    // Take at most MAX_BATCH_SIZE, leave the rest pending
    const ids = allPending.slice(0, MAX_BATCH_SIZE)
    const overflow = allPending.slice(MAX_BATCH_SIZE)

    pendingIds.current.clear()
    overflow.forEach((id) => pendingIds.current.add(id))
    ids.forEach((id) => inflightIds.current.add(id))
    isInflight.current = true
    setIsTranslatingAny(true)

    try {
      const translated = await translateBlocks(
        chapterIdRef.current,
        langRef.current,
        ids
      )
      // Mark as translated
      ids.forEach((id) => {
        inflightIds.current.delete(id)
        translatedIds.current.add(id)
      })
      onBlocksTranslatedRef.current(translated)
    } catch (err) {
      // On failure, remove from inflight so they can be retried
      ids.forEach((id) => inflightIds.current.delete(id))
      console.warn('[useViewportTranslation] Translation failed:', err)
    } finally {
      isInflight.current = false

      // Move queued IDs to pending
      if (queuedIds.current.size > 0) {
        queuedIds.current.forEach((id) => pendingIds.current.add(id))
        queuedIds.current.clear()
      }

      // Flush next batch if there are remaining pending IDs (overflow or queued)
      if (pendingIds.current.size > 0) {
        flushPending()
      } else {
        setIsTranslatingAny(false)
      }
    }
  }, [])

  // Schedule a debounced flush
  const scheduleFush = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null
      flushPending()
    }, DEBOUNCE_MS)
  }, [flushPending])

  // Enqueue a block for translation
  const enqueueBlock = useCallback(
    (blockId: string) => {
      // Skip if already handled
      if (
        translatedIds.current.has(blockId) ||
        pendingIds.current.has(blockId) ||
        inflightIds.current.has(blockId) ||
        queuedIds.current.has(blockId)
      ) {
        return
      }

      if (isInflight.current) {
        // Queue for next batch
        queuedIds.current.add(blockId)
      } else {
        pendingIds.current.add(blockId)
        scheduleFush()
      }
    },
    [scheduleFush]
  )

  // Set up IntersectionObserver
  useEffect(() => {
    if (isSourceLang || !chapterId) {
      // No translation needed — clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const blockId = el.dataset.blockId
            const blockType = el.dataset.blockType
            if (blockId && !SKIP_TYPES.has(blockType || '')) {
              enqueueBlock(blockId)
            }
          }
        }
      },
      { rootMargin: ROOT_MARGIN }
    )

    // Observe all currently registered elements
    elementRefs.current.forEach((el) => {
      observerRef.current!.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [isSourceLang, chapterId, lang, enqueueBlock])

  // Ref callback for each block element
  const getRefCallback = useCallback(
    (blockId: string, blockType: string) => (el: HTMLElement | null) => {
      if (el) {
        el.dataset.blockId = blockId
        el.dataset.blockType = blockType
        elementRefs.current.set(blockId, el)
        if (observerRef.current) {
          observerRef.current.observe(el)
        }
      } else {
        const existing = elementRefs.current.get(blockId)
        if (existing && observerRef.current) {
          observerRef.current.unobserve(existing)
        }
        elementRefs.current.delete(blockId)
      }
    },
    []
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      observerRef.current?.disconnect()
    }
  }, [])

  return { getRefCallback, isTranslatingAny }
}
