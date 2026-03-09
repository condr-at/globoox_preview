'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { translateReaderMetadata } from '@/lib/api'
import {
  getCachedReaderMetadataBundle,
  setCachedReaderMetadataBundle,
} from '@/lib/contentCache'

interface ReaderMetadataTranslationsInput {
  userScope: string
  bookId: string
  activeLang: string
  originalLanguage?: string | null
  title: string
  author?: string | null
  chapters: Array<{
    id: string
    title: string
    translations?: Record<string, string>
  }>
}

export interface ReaderMetadataState {
  isTargetLanguageReaderMetadata: boolean
  isBookMetaPending: boolean
  isTocContentPending: boolean
  readerBookTitle: string
  readerBookAuthor: string | null
  getResolvedChapterTitle: (chapter: { id: string; title: string; translations?: Record<string, string> }) => string
  ensureTocTranslations: () => Promise<void>
}

export function useReaderMetadataTranslations({
  userScope,
  bookId,
  activeLang,
  originalLanguage,
  title,
  author,
  chapters,
}: ReaderMetadataTranslationsInput): ReaderMetadataState {
  const [bundleMeta, setBundleMeta] = useState<{ title: string; author: string | null } | null>(null)
  const [bundleChapterTitles, setBundleChapterTitles] = useState<Map<string, string>>(new Map())
  const inflightLangRef = useRef<string | null>(null)

  const normalizedActiveLang = activeLang.toUpperCase()
  const normalizedOriginalLanguage = originalLanguage?.toUpperCase() ?? null
  const isTargetLanguageReaderMetadata = !!normalizedOriginalLanguage
    && normalizedOriginalLanguage !== normalizedActiveLang

  useEffect(() => {
    setBundleMeta(null)
    setBundleChapterTitles(new Map())
    inflightLangRef.current = null
  }, [activeLang])

  useEffect(() => {
    let cancelled = false

    if (!isTargetLanguageReaderMetadata) {
      setBundleMeta({ title, author: author ?? null })
      setBundleChapterTitles(new Map())
      return () => {
        cancelled = true
      }
    }

    void getCachedReaderMetadataBundle(userScope, bookId, normalizedActiveLang).then((cached) => {
      if (cancelled || !cached) return
      setBundleMeta({ title: cached.title, author: cached.author })
      setBundleChapterTitles(new Map(Object.entries(cached.chapterTitles)))
    })

    void translateReaderMetadata(bookId, normalizedActiveLang)
      .then((result) => {
        if (cancelled) return
        const chapterTitles = Object.fromEntries(result.chapterTitles.map((item) => [item.id, item.title]))
        setBundleMeta({ title: result.title, author: result.author })
        setBundleChapterTitles(new Map(Object.entries(chapterTitles)))
        void setCachedReaderMetadataBundle(userScope, bookId, normalizedActiveLang, {
          title: result.title,
          author: result.author,
          chapterTitles,
        })
      })
      .catch(() => {
        if (cancelled) return
      })

    return () => {
      cancelled = true
    }
  }, [userScope, bookId, normalizedActiveLang, isTargetLanguageReaderMetadata, title, author])

  const getResolvedChapterTitle = useCallback((chapter: { id: string; title: string; translations?: Record<string, string> }) => {
    return bundleChapterTitles.get(chapter.id)
      || chapter.translations?.[normalizedActiveLang]
      || chapter.title
  }, [bundleChapterTitles, normalizedActiveLang])

  const areAllChapterTitlesReady = useMemo(() => {
    if (!isTargetLanguageReaderMetadata) return true
    return chapters.every((chapter) =>
      !chapter.title?.trim()
      || bundleChapterTitles.has(chapter.id)
      || !!chapter.translations?.[normalizedActiveLang],
    )
  }, [isTargetLanguageReaderMetadata, chapters, bundleChapterTitles, normalizedActiveLang])

  const ensureTocTranslations = useCallback(async () => {
    if (!isTargetLanguageReaderMetadata || !chapters.length) return
    if (inflightLangRef.current === normalizedActiveLang) return

    const missing = !bundleMeta || chapters.some((chapter) => {
      if (!chapter.title?.trim()) return false
      return !bundleChapterTitles.has(chapter.id) && !chapter.translations?.[normalizedActiveLang]
    })
    if (!missing) return

    inflightLangRef.current = normalizedActiveLang
    try {
      const result = await translateReaderMetadata(bookId, normalizedActiveLang)
      const chapterTitles = Object.fromEntries(result.chapterTitles.map((item) => [item.id, item.title]))
      setBundleMeta({ title: result.title, author: result.author })
      setBundleChapterTitles(new Map(Object.entries(chapterTitles)))
      void setCachedReaderMetadataBundle(userScope, bookId, normalizedActiveLang, {
        title: result.title,
        author: result.author,
        chapterTitles,
      })
    } catch {
      // keep fallback content visible
    } finally {
      inflightLangRef.current = null
    }
  }, [
    isTargetLanguageReaderMetadata,
    chapters,
    bundleMeta,
    bundleChapterTitles,
    normalizedActiveLang,
    bookId,
    userScope,
  ])

  const isBookMetaPending = isTargetLanguageReaderMetadata && !bundleMeta
  const isTocContentPending = isTargetLanguageReaderMetadata
    && (!bundleMeta || !areAllChapterTitlesReady)

  return {
    isTargetLanguageReaderMetadata,
    isBookMetaPending,
    isTocContentPending,
    readerBookTitle: bundleMeta?.title ?? title,
    readerBookAuthor: bundleMeta?.author ?? author ?? null,
    getResolvedChapterTitle,
    ensureTocTranslations,
  }
}
