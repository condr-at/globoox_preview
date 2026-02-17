const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ApiBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null
  available_languages: string[]
  selected_language?: string | null
  status: string
  created_at: string
}

export interface ApiChapter {
  id: string
  book_id: string
  index: number
  title: string
  created_at: string
}

interface BaseBlock {
  id: string
  position: number
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string
}

export interface ListBlock extends BaseBlock {
  type: 'list'
  ordered: boolean
  items: string[]
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string
  alt: string
  caption?: string
}

export interface HrBlock extends BaseBlock {
  type: 'hr'
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | ListBlock
  | ImageBlock
  | HrBlock

export interface TranslateRequest {
  lang: string
  blockIds: string[]
}

const GET_CACHE_TTL_MS = 2000
const inflightGetRequests = new Map<string, Promise<unknown>>()
const recentGetResponses = new Map<string, { expiresAt: number; value: unknown }>()

function buildGetCacheKey(path: string, options?: RequestInit): string | null {
  const method = (options?.method ?? 'GET').toUpperCase()
  if (method !== 'GET') return null
  const body = typeof options?.body === 'string' ? options.body : ''
  return `${path}::${body}`
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = buildGetCacheKey(path, options)
  if (key) {
    const cached = recentGetResponses.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T
    recentGetResponses.delete(key)

    const inflight = inflightGetRequests.get(key)
    if (inflight) return inflight as Promise<T>
  }

  const fetchPromise = (async () => {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Request failed: ${res.status}`)
    }

    const data = await res.json()
    if (key) {
      recentGetResponses.set(key, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value: data,
      })
    }
    return data as T
  })()

  if (!key) return fetchPromise

  inflightGetRequests.set(key, fetchPromise as Promise<unknown>)
  try {
    return await fetchPromise
  } finally {
    inflightGetRequests.delete(key)
  }
}

export function fetchBooks(status?: string): Promise<ApiBook[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<ApiBook[]>(`/api/books${params}`)
}

export function fetchBook(id: string): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${id}`).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : ''
    const isNotFound = message.includes('404') || message.toLowerCase().includes('not found')
    if (!isNotFound) throw error

    // Backend may not implement /api/books/:id yet.
    const allBooks = await request<ApiBook[]>('/api/books')
    const book = allBooks.find((item) => item.id === id)
    if (!book) throw error
    return book
  })
}

export function createBook(data: { title: string; author?: string; cover_url?: string; source_language?: string }): Promise<ApiBook> {
  return request<ApiBook>('/api/books', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBook(id: string, data: { status?: string; title?: string; author?: string }): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteBook(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/books/${id}`, {
    method: 'DELETE',
  })
}

export function fetchChapters(bookId: string): Promise<ApiChapter[]> {
  return request<ApiChapter[]>(`/api/books/${bookId}/chapters`)
}

export function fetchContent(chapterId: string, lang?: string): Promise<ContentBlock[]> {
  const params = lang ? `?lang=${encodeURIComponent(lang.toUpperCase())}` : ''
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/content${params}`)
}

export function translateBlocks(chapterId: string, lang: string, blockIds: string[]): Promise<ContentBlock[]> {
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/translate`, {
    method: 'POST',
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds }),
  })
}

export function updateBookLanguage(bookId: string, lang: string): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${bookId}/language`, {
    method: 'PATCH',
    body: JSON.stringify({ selected_language: lang.toUpperCase() }),
  })
}
