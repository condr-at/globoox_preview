'use client'

import type { ContentBlock } from '@/lib/api'

type CacheKey = string

const DB_NAME = 'globoox-cache'
const DB_VERSION = 2
const STORE_CHAPTER_CONTENT_V1 = 'chapter_content'
const STORE_CHAPTER_SKELETON = 'chapter_skeleton'
const STORE_BLOCK_TEXT = 'block_text'

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const PENDING_TTL_MS = 3 * 1000 // 3 seconds

function normalizeLang(lang?: string) {
  return (lang ?? '').toUpperCase()
}

function makeBlockKey(blockId: string, lang?: string): CacheKey {
  return `${blockId}::${normalizeLang(lang)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

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
  | { id: string; position: number; type: 'paragraph' | 'quote' }
  | { id: string; position: number; type: 'heading'; level: 1 | 2 | 3 }
  | { id: string; position: number; type: 'list'; ordered: boolean }
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

function assembleBlock(skel: SkeletonBlock, text: CachedBlockText | undefined, lang: string): ContentBlock {
  const base = { id: skel.id, position: skel.position } as any

  if (skel.type === 'heading') {
    const hasText = typeof text?.text === 'string'
    return { ...base, type: 'heading', level: skel.level, text: text?.text ?? '', isTranslated: hasText, is_pending: !hasText, } as any
  }
  if (skel.type === 'paragraph') {
    const hasText = typeof text?.text === 'string'
    return { ...base, type: 'paragraph', text: text?.text ?? '', isTranslated: hasText, is_pending: !hasText } as any
  }
  if (skel.type === 'quote') {
    const hasText = typeof text?.text === 'string'
    return { ...base, type: 'quote', text: text?.text ?? '', isTranslated: hasText, is_pending: !hasText } as any
  }
  if (skel.type === 'list') {
    const hasItems = Array.isArray(text?.items) && text!.items!.length > 0
    return { ...base, type: 'list', ordered: skel.ordered, items: text?.items ?? [], isTranslated: hasItems, is_pending: !hasItems } as any
  }
  if (skel.type === 'image') {
    return { ...base, type: 'image', src: skel.src, alt: skel.alt, caption: skel.caption, isTranslated: true, is_pending: false } as any
  }
  return { ...base, type: 'hr', isTranslated: true, is_pending: false } as any
}

function toSkeleton(blocks: ContentBlock[]): SkeletonBlock[] {
  return blocks.map((b) => {
    if (b.type === 'heading') return { id: b.id, position: b.position, type: 'heading', level: b.level }
    if (b.type === 'paragraph') return { id: b.id, position: b.position, type: 'paragraph' }
    if (b.type === 'quote') return { id: b.id, position: b.position, type: 'quote' }
    if (b.type === 'list') return { id: b.id, position: b.position, type: 'list', ordered: b.ordered }
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
    const skeleton = await withStore<CachedChapterSkeleton | undefined>(
      STORE_CHAPTER_SKELETON,
      'readonly',
      (store) => store.get(chapterId),
    )
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
      .map((skel) => assembleBlock(skel, textMap.get(skel.id), normalizedLang))

    const missing = assembled.filter((b) => b.is_pending === true).length
    return { blocks: assembled, hasPending: missing > 0, missingCount: missing, fetchedAt: skeleton.fetchedAt }
  } catch {
    return null
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
        // Skip writing empty strings/arrays for "pending" blocks if server marks them as pending.
        if (block.is_pending === true) continue
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
