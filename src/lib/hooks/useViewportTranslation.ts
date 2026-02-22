'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ContentBlock, TranslatedBlockResult, translateBlocksStreaming } from '@/lib/api'
import { trackTranslationBatch } from '@/lib/amplitude'

interface UseViewportTranslationOptions {
  bookId: string
  chapterId: string | null
  lang: string
  blocks: ContentBlock[]
  sourceLanguage: string | null
  onBlocksTranslated: (translated: ContentBlock[]) => void
}

const DEBOUNCE_MS = 0 // No debounce - translate immediately
const DEBOUNCE_MS_IMMEDIATE = 0 // No debounce for high-priority blocks
const ROOT_MARGIN = '50% 0px'
const MAX_BATCH_SIZE = 20 // Larger batches for faster prefetch

// Block types that don't need translation
const SKIP_TYPES = new Set(['image', 'hr'])

/** Merge a translatedText string into the appropriate field(s) of a ContentBlock. */
function applyTranslation(block: ContentBlock, translatedText: string): ContentBlock | null {
  if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
    return { ...block, text: translatedText }
  }
  if (block.type === 'list') {
    return { ...block, items: translatedText.split('\n').filter(Boolean) }
  }
  // image / hr — no text translation
  return null
}

export function useViewportTranslation({
  bookId,
  chapterId,
  lang,
  blocks,
  sourceLanguage,
  onBlocksTranslated,
}: UseViewportTranslationOptions) {
  const bookIdRef = useRef(bookId)
  bookIdRef.current = bookId
  const [isTranslatingAny, setIsTranslatingAny] = useState(false)

  // Tracking sets (use refs to avoid re-renders)
  const translatedIds = useRef(new Set<string>())
  const pendingIds = useRef(new Set<string>())
  const inflightIds = useRef(new Set<string>())
  const isInflight = useRef(false)
  const isInflightHighPriority = useRef(false) // Track if current batch is high-priority

  // Queue for next batch while one is in-flight
  const queuedIds = useRef(new Set<string>())
  
  // High-priority queue for current page blocks (takes precedence)
  const highPriorityPendingIds = useRef(new Set<string>())
  const highPriorityQueuedIds = useRef(new Set<string>())

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AbortController for the current in-flight translate request
  const abortControllerRef = useRef<AbortController | null>(null)

  // Refs for latest values (avoid stale closures)
  const chapterIdRef = useRef(chapterId)
  const langRef = useRef(lang)
  const blocksRef = useRef(blocks)
  const onBlocksTranslatedRef = useRef(onBlocksTranslated)

  chapterIdRef.current = chapterId
  langRef.current = lang
  blocksRef.current = blocks
  onBlocksTranslatedRef.current = onBlocksTranslated

  // Element refs map: blockId -> DOM element
  const elementRefs = useRef(new Map<string, HTMLElement>())

  // Observer ref
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Reset all tracking when lang or chapterId changes
  useEffect(() => {
    // Abort any in-flight request for the old context
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    translatedIds.current.clear()
    pendingIds.current.clear()
    inflightIds.current.clear()
    queuedIds.current.clear()
    highPriorityPendingIds.current.clear()
    highPriorityQueuedIds.current.clear()
    isInflight.current = false
    isInflightHighPriority.current = false
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

  // Flush pending IDs: send a streaming translation request
  // isHighPriority: if true, these are current-page blocks that need immediate translation
  const flushPending = useCallback(async (isHighPriority = false) => {
    if (!chapterIdRef.current) return
    
    // If ANY batch is in-flight and we have high-priority blocks, abort it
    // User has navigated to a new page - old translation is no longer immediately visible
    if (isInflight.current && isHighPriority) {
      console.log(JSON.stringify({ event: 'abort_inflight', reason: 'new_high_priority_request', wasHighPriority: isInflightHighPriority.current }))
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Move in-flight IDs back to low-priority pending (they're for old pages)
      inflightIds.current.forEach((id) => pendingIds.current.add(id))
      inflightIds.current.clear()
      isInflight.current = false
      isInflightHighPriority.current = false
      
      // Move queued high-priority IDs to pending so they're processed NOW
      highPriorityQueuedIds.current.forEach((id) => highPriorityPendingIds.current.add(id))
      highPriorityQueuedIds.current.clear()
    }
    
    if (isInflight.current) return

    // Prioritize high-priority blocks over regular pending blocks
    const highPriorityPending = Array.from(highPriorityPendingIds.current)
    const regularPending = Array.from(pendingIds.current)
    
    // Combine with high-priority first
    const allPending = [...highPriorityPending, ...regularPending.filter(id => !highPriorityPendingIds.current.has(id))]
    if (allPending.length === 0) return

    // Take at most MAX_BATCH_SIZE, leave the rest pending
    const ids = allPending.slice(0, MAX_BATCH_SIZE)
    const overflow = allPending.slice(MAX_BATCH_SIZE)

    // Clear both queues and redistribute overflow
    highPriorityPendingIds.current.clear()
    pendingIds.current.clear()
    
    // Put overflow back - maintain priority
    const highPriorityOverflow = overflow.filter(id => highPriorityPending.includes(id))
    const regularOverflow = overflow.filter(id => !highPriorityPending.includes(id))
    highPriorityOverflow.forEach((id) => highPriorityPendingIds.current.add(id))
    regularOverflow.forEach((id) => pendingIds.current.add(id))
    
    ids.forEach((id) => inflightIds.current.add(id))
    isInflight.current = true
    isInflightHighPriority.current = highPriorityPending.length > 0
    setIsTranslatingAny(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Pass the first block id as anchor for future server-side prioritisation
    const anchorBlockId = ids[0] ?? null

    const flushStart = performance.now()
    let hits = 0, misses = 0, errors = 0
    console.log(JSON.stringify({ event: 'flush_start', chapterId: chapterIdRef.current, lang: langRef.current, batchSize: ids.length, overflowSize: overflow.length }))

    try {
      await translateBlocksStreaming(
        chapterIdRef.current,
        langRef.current,
        ids,
        anchorBlockId,
        'down',
        (result: TranslatedBlockResult) => {
          // Each block resolves here as soon as the server emits it — one-by-one
          inflightIds.current.delete(result.blockId)
          translatedIds.current.add(result.blockId)

          if (result.status === 'ok') {
            result.cache === 'hit' ? hits++ : misses++
          } else {
            errors++
          }

          console.log(JSON.stringify({ event: 'block_received', blockId: result.blockId, cache: result.cache, status: result.status }))

          if (result.status === 'ok' && result.translatedText) {
            const original = blocksRef.current.find((b) => b.id === result.blockId)
            if (original) {
              const translated = applyTranslation(original, result.translatedText)
              if (translated) onBlocksTranslatedRef.current([translated])
            }
          }
        },
        controller.signal,
      )
      abortControllerRef.current = null
    } catch (err) {
      abortControllerRef.current = null
      // On failure remove from inflight so blocks can be retried
      ids.forEach((id) => inflightIds.current.delete(id))
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.warn('[useViewportTranslation] Translation failed:', err)
      }
    } finally {
      isInflight.current = false
      isInflightHighPriority.current = false

      const durationMs = Math.round(performance.now() - flushStart)
      console.log(JSON.stringify({ event: 'flush_done', chapterId: chapterIdRef.current, lang: langRef.current, batchSize: ids.length, hits, misses, errors, durationMs }))
      if (hits + misses > 0) {
        trackTranslationBatch({
          book_id: bookIdRef.current,
          chapter_id: chapterIdRef.current ?? '',
          language: langRef.current,
          block_count: ids.length,
          cache_hits: hits,
          cache_misses: misses,
          duration_ms: durationMs,
        })
      }

      // Move queued IDs to pending (maintain priority)
      if (highPriorityQueuedIds.current.size > 0) {
        highPriorityQueuedIds.current.forEach((id) => highPriorityPendingIds.current.add(id))
        highPriorityQueuedIds.current.clear()
      }
      if (queuedIds.current.size > 0) {
        queuedIds.current.forEach((id) => pendingIds.current.add(id))
        queuedIds.current.clear()
      }

      // Flush next batch if there are remaining pending IDs (overflow or queued)
      // Prioritize high-priority blocks
      const hasHighPriority = highPriorityPendingIds.current.size > 0
      if (hasHighPriority || pendingIds.current.size > 0) {
        flushPending(hasHighPriority)
      } else {
        setIsTranslatingAny(false)
      }
    }
  }, [])

  // Schedule a debounced flush
  const scheduleFlush = useCallback((isHighPriority = false) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    const debounceMs = isHighPriority ? DEBOUNCE_MS_IMMEDIATE : DEBOUNCE_MS
    if (debounceMs === 0) {
      // Immediate flush - pass correct priority flag
      debounceTimer.current = null
      flushPending(isHighPriority)
    } else {
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null
        flushPending(isHighPriority)
      }, debounceMs)
    }
  }, [flushPending])

  // Enqueue a block for translation (low priority - prefetch)
  const enqueueBlock = useCallback(
    (blockId: string, isHighPriority = false) => {
      // Skip if already handled
      if (
        translatedIds.current.has(blockId) ||
        inflightIds.current.has(blockId)
      ) {
        return
      }
      
      // Skip if already in any queue (but allow upgrade to high priority)
      const inPending = pendingIds.current.has(blockId) || highPriorityPendingIds.current.has(blockId)
      const inQueued = queuedIds.current.has(blockId) || highPriorityQueuedIds.current.has(blockId)
      
      if (isHighPriority) {
        // Upgrade: remove from low-priority queues if present
        pendingIds.current.delete(blockId)
        queuedIds.current.delete(blockId)
      } else if (inPending || inQueued) {
        // Already queued, skip
        return
      }

      if (isInflight.current) {
        // Queue for next batch
        if (isHighPriority) {
          highPriorityQueuedIds.current.add(blockId)
          // Always trigger flush for high-priority - it will abort in-flight and process immediately
          scheduleFlush(true)
        } else {
          queuedIds.current.add(blockId)
        }
      } else {
        if (isHighPriority) {
          highPriorityPendingIds.current.add(blockId)
        } else {
          pendingIds.current.add(blockId)
        }
        scheduleFlush(isHighPriority)
      }
    },
    [scheduleFlush]
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

  // Abort all in-flight and queued prefetch requests.
  // Called by navigateTo on any non-manual_scroll jump.
  const abortAll = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    pendingIds.current.clear()
    queuedIds.current.clear()
    highPriorityPendingIds.current.clear()
    highPriorityQueuedIds.current.clear()
    inflightIds.current.clear()
    isInflight.current = false
    isInflightHighPriority.current = false
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    setIsTranslatingAny(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      abortControllerRef.current?.abort()
      observerRef.current?.disconnect()
    }
  }, [])

  // Enqueue a set of block IDs for prefetch translation (e.g. next page) - LOW PRIORITY
  const enqueueBlocks = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      const wasNew = !translatedIds.current.has(id) && !pendingIds.current.has(id) && !inflightIds.current.has(id) && !queuedIds.current.has(id) && !highPriorityPendingIds.current.has(id) && !highPriorityQueuedIds.current.has(id)
      enqueueBlock(id, false) // low priority
      if (wasNew) newCount++
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'low' }))
    }
  }, [enqueueBlock])
  
  // Enqueue a set of block IDs for IMMEDIATE translation (current page) - HIGH PRIORITY
  const enqueueBlocksImmediate = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      const wasNew = !translatedIds.current.has(id) && !inflightIds.current.has(id)
      enqueueBlock(id, true) // high priority
      if (wasNew) newCount++
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks_immediate', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'high' }))
    }
  }, [enqueueBlock])

  return { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate }
}
