'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ContentBlock, TranslatedBlockResult, TranslateDoneEvent, translateBlocksStreaming } from '@/lib/api'
import { trackTranslationBatch } from '@/lib/posthog'
import { setCachedTranslatedBlockText } from '@/lib/contentCache'

interface UseViewportTranslationOptions {
  bookId: string
  chapterId: string | null
  lang: string
  blocks: ContentBlock[]
  sourceLanguage: string | null
  canTranslate: boolean
  onBlocksTranslated: (translated: ContentBlock[]) => void
}

const DEBOUNCE_MS = 0 // No debounce - translate immediately
const DEBOUNCE_MS_IMMEDIATE = 0 // No debounce for high-priority blocks
const ROOT_MARGIN = '50% 0px'
const MAX_BATCH_SIZE = 10 // Smaller batches to reduce duplicate requests and improve responsiveness

// Block types that don't need translation
const SKIP_TYPES = new Set(['image', 'hr'])

/** Merge a translatedText string into the appropriate field(s) of a ContentBlock. */
function applyTranslation(block: ContentBlock, translatedText: string): ContentBlock | null {
  if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
    return { ...block, text: translatedText, isTranslated: true, is_pending: false }
  }
  if (block.type === 'list') {
    return { ...block, items: translatedText.split('\n').filter(Boolean), isTranslated: true, is_pending: false }
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
  canTranslate,
  onBlocksTranslated,
}: UseViewportTranslationOptions) {
  const isMountedRef = useRef(true)
  const bookIdRef = useRef(bookId)
  bookIdRef.current = bookId
  const [isTranslatingAny, setIsTranslatingAny] = useState(false)
  // Expose pending block IDs as state for blur effect
  const [pendingBlockIds, setPendingBlockIds] = useState<Set<string>>(new Set())

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

  // Helper to sync pendingBlockIds state with current queues
  const updatePendingBlockIds = useCallback(() => {
    const allPending = new Set<string>([
      ...pendingIds.current,
      ...inflightIds.current,
      ...queuedIds.current,
      ...highPriorityPendingIds.current,
      ...highPriorityQueuedIds.current,
    ])
    if (isMountedRef.current) setPendingBlockIds(allPending)
  }, [])

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AbortController for the current in-flight translate request
  const abortControllerRef = useRef<AbortController | null>(null)

  // Refs for latest values (avoid stale closures)
  const chapterIdRef = useRef(chapterId)
  const langRef = useRef(lang)
  const blocksRef = useRef(blocks)
  const onBlocksTranslatedRef = useRef(onBlocksTranslated)
  const canTranslateRef = useRef(canTranslate)

  chapterIdRef.current = chapterId
  langRef.current = lang
  blocksRef.current = blocks
  onBlocksTranslatedRef.current = onBlocksTranslated
  canTranslateRef.current = canTranslate

  // Element refs map: blockId -> DOM element
  const elementRefs = useRef(new Map<string, HTMLElement>())

  // Observer ref
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Reset all tracking when lang or chapterId change.
  // IMPORTANT: do NOT depend on `blocks` here — `blocks` is `displayBlocks` which
  // gets a new reference on every single translation callback. Depending on it would
  // cause a reset→abort→re-enqueue cascade producing dozens of canceled API calls.
  // Pre-translated blocks are already handled by enqueueBlock() which checks
  // block.isTranslated via blocksRef before sending any request.
  useEffect(() => {
    // Abort any in-flight request for the old context
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Clear all tracking sets
    translatedIds.current.clear()
    pendingIds.current.clear()
    inflightIds.current.clear()
    queuedIds.current.clear()
    highPriorityPendingIds.current.clear()
    highPriorityQueuedIds.current.clear()
    isInflight.current = false
    isInflightHighPriority.current = false
    if (isMountedRef.current) {
      setIsTranslatingAny(false)
      setPendingBlockIds(new Set())
    }

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
    if (!canTranslateRef.current) return
    const requestChapterId = chapterIdRef.current
    if (!requestChapterId) return
    
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
    if (isMountedRef.current) setIsTranslatingAny(true)
    updatePendingBlockIds()

    const controller = new AbortController()
    abortControllerRef.current = controller
    const requestLang = langRef.current
    const requestBlocksById = new Map(
      blocksRef.current.map((b) => [b.id, b] as const)
    )

    // Pass the first block id as anchor for future server-side prioritisation
    const anchorBlockId = ids[0] ?? null

    const flushStart = performance.now()
    let hits = 0, misses = 0, errors = 0
    console.log(JSON.stringify({ event: 'flush_start', chapterId: requestChapterId, lang: requestLang, batchSize: ids.length, overflowSize: overflow.length }))

    try {
      await translateBlocksStreaming(
        requestChapterId,
        requestLang,
        ids,
        anchorBlockId,
        'down',
        (result: TranslatedBlockResult) => {
          // Each block resolves here as soon as the server emits it — one-by-one
          inflightIds.current.delete(result.blockId)
          translatedIds.current.add(result.blockId)
          updatePendingBlockIds()

          if (result.status === 'ok') {
            result.cache === 'hit' ? hits++ : misses++
          } else {
            errors++
          }

          console.log(JSON.stringify({ event: 'block_received', blockId: result.blockId, cache: result.cache, status: result.status }))

          if (result.status === 'ok' && result.translatedText) {
            const original = requestBlocksById.get(result.blockId)
            if (original) {
              const translated = applyTranslation(original, result.translatedText)
              if (translated) {
                const sameRequestContext =
                  chapterIdRef.current === requestChapterId &&
                  langRef.current === requestLang
                if (isMountedRef.current && sameRequestContext) {
                  onBlocksTranslatedRef.current([translated])
                }
                void setCachedTranslatedBlockText(requestChapterId, requestLang, translated)
              }
            }
          }
        },
        controller.signal,
        (doneEvent) => {
          // Server sent translate_done event with final metrics
          console.log(JSON.stringify(doneEvent))
        },
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
      console.log(JSON.stringify({ event: 'flush_done', chapterId: requestChapterId, lang: requestLang, batchSize: ids.length, hits, misses, errors, durationMs }))
      if (hits + misses > 0) {
        trackTranslationBatch({
          book_id: bookIdRef.current,
          chapter_id: requestChapterId ?? '',
          language: requestLang,
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
        if (isMountedRef.current) setIsTranslatingAny(false)
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

  // Enqueue a single block for translation.
  // triggerFlush: when false, caller is responsible for calling scheduleFlush after
  // batching multiple blocks. This avoids an abort cascade where each block in a
  // loop aborts the in-flight batch started by the previous block.
  const enqueueBlock = useCallback(
    (blockId: string, isHighPriority = false, triggerFlush = true): boolean => {
      if (!canTranslateRef.current) return false
      // Skip if already handled
      if (
        translatedIds.current.has(blockId) ||
        inflightIds.current.has(blockId)
      ) {
        return false
      }

      // Skip if block is already translated (from content endpoint)
      const block = blocksRef.current.find((b) => b.id === blockId)
      if (block?.isTranslated) {
        translatedIds.current.add(blockId)
        return false
      }

      // Skip if already in any queue (but allow upgrade to high priority)
      const inHighPending = highPriorityPendingIds.current.has(blockId)
      const inHighQueued = highPriorityQueuedIds.current.has(blockId)
      const inPending = pendingIds.current.has(blockId) || inHighPending
      const inQueued = queuedIds.current.has(blockId) || inHighQueued

      if (isHighPriority) {
        // Already in high-priority queue — no-op
        if (inHighPending || inHighQueued) return false
        // Upgrade: remove from low-priority queues if present
        pendingIds.current.delete(blockId)
        queuedIds.current.delete(blockId)
      } else if (inPending || inQueued) {
        // Already queued, skip
        return false
      }

      if (isInflight.current) {
        // Queue for next batch
        if (isHighPriority) {
          highPriorityQueuedIds.current.add(blockId)
        } else {
          queuedIds.current.add(blockId)
        }
      } else {
        if (isHighPriority) {
          highPriorityPendingIds.current.add(blockId)
        } else {
          pendingIds.current.add(blockId)
        }
      }

      if (triggerFlush) scheduleFlush(isHighPriority)
      updatePendingBlockIds()
      return true
    },
    [scheduleFlush, updatePendingBlockIds]
  )

  // Set up IntersectionObserver
  useEffect(() => {
    if (isSourceLang || !chapterId || !canTranslate) {
      // No translation needed — clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let enqueued = false
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const blockId = el.dataset.blockId
            const blockType = el.dataset.blockType
            if (blockId && !SKIP_TYPES.has(blockType || '')) {
              if (enqueueBlock(blockId, false, false)) enqueued = true
            }
          }
        }
        if (enqueued) scheduleFlush(false)
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
  }, [isSourceLang, chapterId, lang, enqueueBlock, scheduleFlush, canTranslate])

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
    if (isMountedRef.current) {
      setIsTranslatingAny(false)
      setPendingBlockIds(new Set())
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      // Intentionally keep in-flight request alive across reader unmount,
      // so translated blocks can still be persisted to IndexedDB.
      observerRef.current?.disconnect()
    }
  }, [])

  // Enqueue a set of block IDs for prefetch translation (e.g. next page) - LOW PRIORITY
  // All blocks are added to the queue first, then a single flush is triggered.
  const enqueueBlocks = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      if (enqueueBlock(id, false, false)) newCount++
    }
    // Single flush after all blocks are queued
    if (newCount > 0) {
      scheduleFlush(false)
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'low' }))
    }
  }, [enqueueBlock, scheduleFlush])

  // Enqueue a set of block IDs for IMMEDIATE translation (current page) - HIGH PRIORITY
  // All blocks are added to the queue first, then a single flush is triggered.
  // This avoids the abort cascade where each block aborts the batch started by the previous one.
  const enqueueBlocksImmediate = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      if (enqueueBlock(id, true, false)) newCount++
    }
    // Single flush after all blocks are queued — at most one abort of a prior in-flight batch
    if (newCount > 0) {
      scheduleFlush(true)
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks_immediate', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'high' }))
    }
  }, [enqueueBlock, scheduleFlush])

  return { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds }
}
