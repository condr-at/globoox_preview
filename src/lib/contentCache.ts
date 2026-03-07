'use client'

import type { ContentBlock } from '@/lib/api'
import type { ApiBook, ReadingPosition } from '@/lib/api'
import type { ReadingAnchor } from '@/lib/store'

type CacheKey = string

const DB_NAME = 'globoox-cache'
const DB_VERSION = 6
const STORE_CHAPTER_CONTENT_V1 = 'chapter_content'
const STORE_CHAPTER_SKELETON = 'chapter_skeleton'
const STORE_BLOCK_TEXT = 'block_text'
const STORE_CHAPTER_LAYOUT = 'chapter_layout'
const STORE_BOOKS_LIST = 'books_list'
const STORE_BOOK_META = 'book_meta'
const STORE_READING_POSITIONS = 'reading_positions'
const STORE_TOC_TITLES = 'toc_titles'

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const PENDING_TTL_MS = 3 * 1000 // 3 seconds

function normalizeLang(lang?: string) {
  return (lang ?? '').toUpperCase()
}

function makeBlockKey(blockId: string, lang?: string): CacheKey {
  return `${blockId}::${normalizeLang(lang)}`
}

function makeLegacyChapterKey(chapterId: string, lang?: string): CacheKey {
  return `${chapterId}::${normalizeLang(lang)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = req.result
      const tx = req.transaction
      const oldVersion = event.oldVersion ?? 0

      // Legacy store (v1) — keep it for compatibility, but new code won't write to it.
      if (!db.objectStoreNames.contains(STORE_CHAPTER_CONTENT_V1)) {
        const store = db.createObjectStore(STORE_CHAPTER_CONTENT_V1, { keyPath: 'key' })
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_CHAPTER_SKELETON)) {
        const store = db.createObjectStore(STORE_CHAPTER_SKELETON, { keyPath: 'chapterId' })
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_BLOCK_TEXT)) {
        const store = db.createObjectStore(STORE_BLOCK_TEXT, { keyPath: 'key' })
        store.createIndex('by_chapter_lang', ['chapterId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_CHAPTER_LAYOUT)) {
        const store = db.createObjectStore(STORE_CHAPTER_LAYOUT, { keyPath: 'key' })
        store.createIndex('by_book_chapter', ['bookId', 'chapterId'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      // App-level persisted caches (v3)
      if (!db.objectStoreNames.contains(STORE_BOOKS_LIST)) {
        const store = db.createObjectStore(STORE_BOOKS_LIST, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_BOOK_META)) {
        const store = db.createObjectStore(STORE_BOOK_META, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_bookId', 'bookId')
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_READING_POSITIONS)) {
        const store = db.createObjectStore(STORE_READING_POSITIONS, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_updatedAt', 'updatedAt')
      }

      if (!db.objectStoreNames.contains(STORE_TOC_TITLES)) {
        const store = db.createObjectStore(STORE_TOC_TITLES, { keyPath: 'key' })
        store.createIndex('by_scope_book_lang', ['scope', 'bookId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      // v5: clear chapter translation caches once to remove mixed-language data
      // and old skeletons that did not preserve fallback content.
      if (oldVersion < 5 && tx) {
        if (db.objectStoreNames.contains(STORE_CHAPTER_CONTENT_V1)) {
          tx.objectStore(STORE_CHAPTER_CONTENT_V1).clear()
        }
        if (db.objectStoreNames.contains(STORE_CHAPTER_SKELETON)) {
          tx.objectStore(STORE_CHAPTER_SKELETON).clear()
        }
        if (db.objectStoreNames.contains(STORE_BLOCK_TEXT)) {
          tx.objectStore(STORE_BLOCK_TEXT).clear()
        }
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
  })
}

function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const req = fn(store)

        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))

        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB transaction failed'))
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB transaction aborted'))
        }
      }),
    (err) => Promise.reject(err),
  )
}

type SkeletonBlock =
  | { id: string; position: number; type: 'paragraph' | 'quote'; fallbackText: string }
  | { id: string; position: number; type: 'heading'; level: 1 | 2 | 3; fallbackText: string }
  | { id: string; position: number; type: 'list'; ordered: boolean; fallbackItems: string[] }
  | { id: string; position: number; type: 'image'; src: string; alt: string; caption?: string }
  | { id: string; position: number; type: 'hr' }

interface CachedChapterSkeleton {
  chapterId: string
  blocks: SkeletonBlock[]
  fetchedAt: number
}

interface CachedBlockText {
  key: CacheKey
  chapterId: string
  blockId: string
  lang: string
  text?: string
  items?: string[]
  fetchedAt: number
}

export interface CachedAssembledChapter {
  blocks: ContentBlock[]
  hasPending: boolean
  missingCount: number
  fetchedAt: number
}

// ─── App-level persisted caches (books, reading position, TOC) ────────────────

function makeScopedKey(scope: string, ...parts: string[]): CacheKey {
  return [scope, ...parts].join('::')
}

interface CachedBooksList {
  key: CacheKey
  scope: string
  status: string
  books: ApiBook[]
  fetchedAt: number
}

interface CachedBookMeta {
  key: CacheKey
  scope: string
  bookId: string
  book: ApiBook
  fetchedAt: number
}

export interface CachedReadingPositionEntry {
  key: CacheKey
  scope: string
  bookId: string
  position: ReadingPosition
  updatedAt: string | null
  fetchedAt: number
  pendingAnchor?: ReadingAnchor
}

interface CachedTocTitles {
  key: CacheKey
  scope: string
  bookId: string
  lang: string
  titles: Record<string, string>
  fetchedAt: number
}

export interface CachedChapterLayoutEntry {
  key: CacheKey
  bookId: string
  chapterId: string
  layoutKey: string
  pages: string[][]
  finalBlocks: ContentBlock[]
  fragmentEntries: Array<[string, string]>
  currentPageIdx: number
  fetchedAt: number
}

export async function getCachedBooksList(scope: string, status = 'active'): Promise<CachedBooksList | null> {
  try {
    const key = makeScopedKey(scope, status)
    const entry = await withStore<CachedBooksList | undefined>(STORE_BOOKS_LIST, 'readonly', (store) => store.get(key))
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedBooksList(scope: string, status: string, books: ApiBook[]): Promise<void> {
  const entry: CachedBooksList = {
    key: makeScopedKey(scope, status),
    scope,
    status,
    books,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_BOOKS_LIST, 'readwrite', (store) => store.put(entry))
}

export async function clearCachedBooksList(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS_LIST, 'readwrite')
      const store = tx.objectStore(STORE_BOOKS_LIST)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function getCachedBookMeta(scope: string, bookId: string): Promise<ApiBook | null> {
  try {
    const key = makeScopedKey(scope, bookId)
    const entry = await withStore<CachedBookMeta | undefined>(STORE_BOOK_META, 'readonly', (store) => store.get(key))
    return entry?.book ?? null
  } catch {
    return null
  }
}

export async function setCachedBookMeta(scope: string, book: ApiBook): Promise<void> {
  const entry: CachedBookMeta = {
    key: makeScopedKey(scope, book.id),
    scope,
    bookId: book.id,
    book,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_BOOK_META, 'readwrite', (store) => store.put(entry))
}

export async function clearCachedBookMeta(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOK_META, 'readwrite')
      const store = tx.objectStore(STORE_BOOK_META)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function getCachedReadingPosition(scope: string, bookId: string): Promise<CachedReadingPositionEntry | null> {
  try {
    const key = makeScopedKey(scope, bookId)
    const entry = await withStore<CachedReadingPositionEntry | undefined>(
      STORE_READING_POSITIONS,
      'readonly',
      (store) => store.get(key),
    )
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedReadingPosition(scope: string, bookId: string, entry: Omit<CachedReadingPositionEntry, 'key' | 'scope' | 'bookId' | 'fetchedAt'>): Promise<void> {
  const full: CachedReadingPositionEntry = {
    key: makeScopedKey(scope, bookId),
    scope,
    bookId,
    position: entry.position,
    updatedAt: entry.updatedAt ?? entry.position.updated_at ?? null,
    pendingAnchor: entry.pendingAnchor,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_READING_POSITIONS, 'readwrite', (store) => store.put(full))
}

export async function clearCachedReadingPositions(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_READING_POSITIONS, 'readwrite')
      const store = tx.objectStore(STORE_READING_POSITIONS)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function getCachedTocTitles(scope: string, bookId: string, lang: string): Promise<Record<string, string> | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    const key = makeScopedKey(scope, bookId, normalizedLang)
    const entry = await withStore<CachedTocTitles | undefined>(STORE_TOC_TITLES, 'readonly', (store) => store.get(key))
    return entry?.titles ?? null
  } catch {
    return null
  }
}

export async function setCachedTocTitles(scope: string, bookId: string, lang: string, titles: Record<string, string>): Promise<void> {
  const normalizedLang = normalizeLang(lang)
  const entry: CachedTocTitles = {
    key: makeScopedKey(scope, bookId, normalizedLang),
    scope,
    bookId,
    lang: normalizedLang,
    titles,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_TOC_TITLES, 'readwrite', (store) => store.put(entry))
}

export async function getCachedChapterLayout(layoutKey: string): Promise<CachedChapterLayoutEntry | null> {
  try {
    const entry = await withStore<CachedChapterLayoutEntry | undefined>(
      STORE_CHAPTER_LAYOUT,
      'readonly',
      (store) => store.get(layoutKey),
    )
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedChapterLayout(entry: Omit<CachedChapterLayoutEntry, 'fetchedAt'>): Promise<void> {
  const fullEntry: CachedChapterLayoutEntry = {
    ...entry,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_CHAPTER_LAYOUT, 'readwrite', (store) => store.put(fullEntry))
}

export async function clearCachedChapterLayouts(bookId?: string, chapterId?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTER_LAYOUT, 'readwrite')
      const store = tx.objectStore(STORE_CHAPTER_LAYOUT)
      const req = (bookId || chapterId)
        ? store.index('by_book_chapter').openCursor()
        : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        const value = cursor.value as CachedChapterLayoutEntry
        if (bookId && value.bookId !== bookId) {
          cursor.continue()
          return
        }
        if (chapterId && value.chapterId !== chapterId) {
          cursor.continue()
          return
        }
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function clearCachedTocTitles(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TOC_TITLES, 'readwrite')
      const store = tx.objectStore(STORE_TOC_TITLES)
      const req = scope ? store.index('by_scope_book_lang').openCursor() : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        if (scope && cursor.value?.scope !== scope) {
          cursor.continue()
          return
        }
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

function assembleBlock(skel: SkeletonBlock, text: CachedBlockText | undefined): ContentBlock {
  const base = { id: skel.id, position: skel.position }

  if (skel.type === 'heading') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'heading',
      level: skel.level,
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'paragraph') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'paragraph',
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'quote') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'quote',
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'list') {
    const hasItems = Array.isArray(text?.items) && text!.items!.length > 0
    return {
      ...base,
      type: 'list',
      ordered: skel.ordered,
      items: text?.items ?? skel.fallbackItems,
      targetLangReady: hasItems,
      isTranslated: hasItems,
      is_pending: !hasItems,
    }
  }
  if (skel.type === 'image') {
    return { ...base, type: 'image', src: skel.src, alt: skel.alt, caption: skel.caption, targetLangReady: true, isTranslated: true, is_pending: false }
  }
  return { ...base, type: 'hr', targetLangReady: true, isTranslated: true, is_pending: false }
}

function toSkeleton(blocks: ContentBlock[]): SkeletonBlock[] {
  return blocks.map((b) => {
    if (b.type === 'heading') return { id: b.id, position: b.position, type: 'heading', level: b.level, fallbackText: b.text ?? '' }
    if (b.type === 'paragraph') return { id: b.id, position: b.position, type: 'paragraph', fallbackText: b.text ?? '' }
    if (b.type === 'quote') return { id: b.id, position: b.position, type: 'quote', fallbackText: b.text ?? '' }
    if (b.type === 'list') return { id: b.id, position: b.position, type: 'list', ordered: b.ordered, fallbackItems: b.items ?? [] }
    if (b.type === 'image') return { id: b.id, position: b.position, type: 'image', src: b.src, alt: b.alt, caption: b.caption }
    return { id: b.id, position: b.position, type: 'hr' }
  })
}

function toBlockText(chapterId: string, lang: string, block: ContentBlock): CachedBlockText | null {
  if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
    return {
      key: makeBlockKey(block.id, lang),
      chapterId,
      blockId: block.id,
      lang: normalizeLang(lang),
      text: block.text ?? '',
      fetchedAt: Date.now(),
    }
  }
  if (block.type === 'list') {
    return {
      key: makeBlockKey(block.id, lang),
      chapterId,
      blockId: block.id,
      lang: normalizeLang(lang),
      items: block.items ?? [],
      fetchedAt: Date.now(),
    }
  }
  return null
}

export async function getCachedChapterContent(chapterId: string, lang?: string): Promise<CachedAssembledChapter | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    let skeleton = await withStore<CachedChapterSkeleton | undefined>(
      STORE_CHAPTER_SKELETON,
      'readonly',
      (store) => store.get(chapterId),
    )

    // On-demand migration from legacy v1 store (chapter cached as full blocks array).
    if (!skeleton) {
      type LegacyEntry = { key: string; chapterId: string; lang: string; blocks: ContentBlock[]; fetchedAt: number }
      const legacyKey = makeLegacyChapterKey(chapterId, normalizedLang)
      const legacy = await withStore<LegacyEntry | undefined>(
        STORE_CHAPTER_CONTENT_V1,
        'readonly',
        (store) => store.get(legacyKey),
      )
      if (legacy?.blocks?.length) {
        await setCachedChapterContent(chapterId, normalizedLang, legacy.blocks)
        skeleton = await withStore<CachedChapterSkeleton | undefined>(
          STORE_CHAPTER_SKELETON,
          'readonly',
          (store) => store.get(chapterId),
        )
      }
    }

    if (!skeleton) return null

    const texts = await openDb().then(
      (db) =>
        new Promise<CachedBlockText[]>((resolve, reject) => {
          const tx = db.transaction(STORE_BLOCK_TEXT, 'readonly')
          const store = tx.objectStore(STORE_BLOCK_TEXT)
          const index = store.index('by_chapter_lang')
          const req = index.getAll(IDBKeyRange.only([chapterId, normalizedLang]))
          req.onsuccess = () => resolve(req.result as CachedBlockText[])
          req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
          tx.oncomplete = () => db.close()
          tx.onerror = () => {
            db.close()
            reject(tx.error ?? new Error('IndexedDB transaction failed'))
          }
        }),
    )

    const textMap = new Map(texts.map((t) => [t.blockId, t]))
    const assembled = skeleton.blocks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((skel) => assembleBlock(skel, textMap.get(skel.id)))

    const missing = assembled.filter((b) => b.is_pending === true).length
    return { blocks: assembled, hasPending: missing > 0, missingCount: missing, fetchedAt: skeleton.fetchedAt }
  } catch {
    return null
  }
}

export async function getCachedChapterBlockIds(chapterId: string): Promise<string[]> {
  try {
    const skeleton = await withStore<CachedChapterSkeleton | undefined>(
      STORE_CHAPTER_SKELETON,
      'readonly',
      (store) => store.get(chapterId),
    )
    if (!skeleton?.blocks?.length) return []
    return skeleton.blocks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((block) => block.id)
  } catch {
    return []
  }
}

export async function setCachedChapterContent(
  chapterId: string,
  lang: string | undefined,
  blocks: ContentBlock[],
): Promise<void> {
  try {
    const normalizedLang = normalizeLang(lang)

    const skeleton: CachedChapterSkeleton = {
      chapterId,
      blocks: toSkeleton(blocks),
      fetchedAt: Date.now(),
    }

    // Transaction over both stores
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTER_SKELETON, STORE_BLOCK_TEXT], 'readwrite')
      const skeletonStore = tx.objectStore(STORE_CHAPTER_SKELETON)
      skeletonStore.put(skeleton)

      const textStore = tx.objectStore(STORE_BLOCK_TEXT)
      for (const block of blocks) {
        const entry = toBlockText(chapterId, normalizedLang, block)
        if (!entry) continue
        // Only persist text for the requested lang when that lang is actually ready.
        if (!(block.targetLangReady ?? block.isTranslated)) continue
        textStore.put(entry)
      }

      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }
    })
  } catch {
    // best-effort cache
  }
}

export function isCacheFresh(entry: CachedAssembledChapter, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const effectiveTtl = entry.hasPending ? Math.min(ttlMs, PENDING_TTL_MS) : ttlMs
  return Date.now() - entry.fetchedAt < effectiveTtl
}

export async function invalidateAllChapterContentCache(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTER_CONTENT_V1, STORE_CHAPTER_SKELETON, STORE_BLOCK_TEXT], 'readwrite')
      tx.objectStore(STORE_CHAPTER_CONTENT_V1).clear()
      tx.objectStore(STORE_CHAPTER_SKELETON).clear()
      tx.objectStore(STORE_BLOCK_TEXT).clear()
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
    })
  } catch {
    // best-effort
  }
}

export async function setCachedTranslatedBlockText(
  chapterId: string,
  lang: string,
  translatedBlock: ContentBlock,
): Promise<void> {
  try {
    const normalizedLang = normalizeLang(lang)
    const entry = toBlockText(chapterId, normalizedLang, translatedBlock)
    if (!entry) return
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_BLOCK_TEXT, STORE_CHAPTER_SKELETON], 'readwrite')
      tx.objectStore(STORE_BLOCK_TEXT).put(entry)
      const skelStore = tx.objectStore(STORE_CHAPTER_SKELETON)
      const getReq = skelStore.get(chapterId)
      getReq.onsuccess = () => {
        const skel = getReq.result as CachedChapterSkeleton | undefined
        if (skel) skelStore.put({ ...skel, fetchedAt: Date.now() })
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }
    })
  } catch {
    // best-effort
  }
}
