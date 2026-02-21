import { trackApiRequest } from './amplitude'

// In browser we must call local Next.js API routes (/api/*), so auth can be injected by proxy.
// Direct backend calls are allowed only during server-side execution.
const API_URL = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : ''

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
  depth: number
  parent_id: string | null
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
  anchorBlockId?: string | null
  direction?: 'up' | 'down'
}

export interface TranslatedBlockResult {
  blockId: string
  status: 'ok' | 'error'
  cache: 'hit' | 'miss'
  translatedText: string
}

export interface ReadingPosition {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  lang: string | null
  updated_at: string | null
}

export interface SaveReadingPositionRequest {
  chapter_id: string
  block_id?: string | null
  block_position?: number | null
  lang?: string | null
  updated_at_client?: string
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
    const hasBody = typeof options?.body === 'string' && options.body.length > 0
    const headers = hasBody
      ? { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      : options?.headers

    const method = (options?.method ?? 'GET').toUpperCase()
    const startTime = performance.now()
    let statusCode: number | undefined

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      })
      statusCode = res.status
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

      const durationMs = performance.now() - startTime
      trackApiRequest(path, method, durationMs, true, statusCode)

      return data as T
    } catch (error) {
      const durationMs = performance.now() - startTime
      trackApiRequest(path, method, durationMs, false, statusCode)
      throw error
    }
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
  // Some backend deployments expose only GET /api/books (without /api/books/:id).
  // Resolve book from list to avoid noisy 404 in reader startup.
  return request<ApiBook[]>('/api/books').then((allBooks) => {
    const book = allBooks.find((item) => item.id === id)
    if (!book) throw new Error('Book not found')
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

export function translateBlocks(
  chapterId: string,
  lang: string,
  blockIds: string[],
  signal?: AbortSignal,
): Promise<ContentBlock[]> {
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/translate`, {
    method: 'POST',
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds }),
    signal,
  })
}

/**
 * Stream block translations one-by-one as they resolve on the server.
 * Calls onBlock for each block result as it arrives (NDJSON stream).
 * Falls back to parsing a plain JSON array if the server does not stream.
 */
export async function translateBlocksStreaming(
  chapterId: string,
  lang: string,
  blockIds: string[],
  anchorBlockId: string | null,
  direction: 'up' | 'down',
  onBlock: (result: TranslatedBlockResult) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chapters/${chapterId}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds, anchorBlockId, direction }),
    signal,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error((errBody as any).message || `Request failed: ${res.status}`)
  }

  if (!res.body) throw new Error('No response body')

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('ndjson')) {
    // Parse NDJSON line-by-line as data arrives
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete last line
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            onBlock(JSON.parse(trimmed) as TranslatedBlockResult)
          } catch {
            // skip malformed lines
          }
        }
      }
      // Handle any remaining buffered content
      if (buffer.trim()) {
        try { onBlock(JSON.parse(buffer.trim()) as TranslatedBlockResult) } catch { /* ignore */ }
      }
    } finally {
      reader.releaseLock()
    }
  } else {
    // Fallback: plain JSON array (older server version)
    const data = await res.json() as ContentBlock[]
    for (const block of data) {
      let translatedText = ''
      if ('text' in block && typeof (block as any).text === 'string') translatedText = (block as any).text
      else if ('items' in block && Array.isArray((block as any).items)) translatedText = (block as any).items.join('\n')
      onBlock({ blockId: block.id, status: 'ok', cache: 'miss', translatedText })
    }
  }
}

export function updateBookLanguage(bookId: string, lang: string): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${bookId}/language`, {
    method: 'PATCH',
    body: JSON.stringify({ selected_language: lang.toUpperCase() }),
  })
}

export function fetchReadingPosition(bookId: string): Promise<ReadingPosition> {
  return request<ReadingPosition>(`/api/books/${bookId}/reading-position`)
}

export function saveReadingPosition(
  bookId: string,
  data: SaveReadingPositionRequest
): Promise<{ success: boolean; persisted: boolean }> {
  return request<{ success: boolean; persisted: boolean }>(`/api/books/${bookId}/reading-position`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export interface UploadBookData {
  title: string
  author?: string
  cover_url?: string | null
  file_path?: string
  file_size?: number
  source_language?: string | null
  chapters: {
    title: string
    href: string
    content: string
    depth: number
    parentIndex: number | null
    blocks: {
      type: string
      text?: string
      level?: number
      items?: string[]
      src?: string
      alt?: string
    }[]
  }[]
}

export function uploadBook(data: UploadBookData): Promise<ApiBook> {
  return request<ApiBook>('/api/books/upload', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
