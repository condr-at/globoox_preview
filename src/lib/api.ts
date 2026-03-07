import { trackApiRequest } from './posthog'
import { setCachedBookMeta } from './contentCache'

// In browser we must call local Next.js API routes (/api/*), so auth can be injected by proxy.
// Direct backend calls are allowed only during server-side execution.
// Browser: '' (empty) → calls /api/* routes which proxy to backend
// Server: API_URL or NEXT_PUBLIC_API_URL → direct backend calls (for SSR/SSG)
const API_URL = typeof window === 'undefined' ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '') : ''

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

// Simple in-memory cache for book metadata to avoid spinners during in-app navigation.
const bookByIdCache = new Map<string, ApiBook>()

export function getCachedBookById(id: string): ApiBook | undefined {
  return bookByIdCache.get(id)
}

export interface ApiChapter {
  id: string
  book_id: string
  index: number
  title: string
  translations?: Record<string, string>
  depth: number
  parent_id: string | null
  created_at: string
}

interface BaseBlock {
  id: string
  position: number
  parentId?: string
  partIndex?: number
  isFirstPart?: boolean
  isLastPart?: boolean
  targetLangReady?: boolean
  isTranslated?: boolean // True if block already has translation for requested language
  is_pending?: boolean // True if translation is pending on the server
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

export interface TranslateDoneEvent {
  event: 'translate_done'
  chapterId: string
  lang: string
  hits: number
  misses: number
  errors: number
  llmCalls: number
  totalDurationMs: number
  tokensIn: number
  tokensOut: number
  retries: number
  fallbacks: number
}

function normalizeContentBlock(block: ContentBlock): ContentBlock {
  if (block.type === 'image' || block.type === 'hr') {
    return {
      ...block,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  const targetLangReady = block.targetLangReady ?? (block.isTranslated === true)
  return {
    ...block,
    targetLangReady,
    isTranslated: targetLangReady,
    is_pending: !targetLangReady,
  }
}

export type TranslateStreamMessage = TranslatedBlockResult | TranslateDoneEvent

export type BlockTextPayload =
  | { blockId: string; type: 'paragraph' | 'quote' | 'heading'; text: string }
  | { blockId: string; type: 'list'; items: string[] }

export interface FetchBlockTextsResponse {
  chapterId: string
  lang: string
  ok: BlockTextPayload[]
  missing: string[]
  pending?: string[]
}

export interface ReadingPosition {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  sentence_index?: number | null
  total_blocks?: number | null
  lang: string | null
  updated_at: string | null
}

export interface SaveReadingPositionRequest {
  chapter_id: string
  block_id?: string | null
  block_position?: number | null
  sentence_index?: number | null
  lang?: string | null
  updated_at_client?: string
}

export interface SaveReadingPositionResponse {
  success: boolean
  persisted: boolean
  reason?: 'stale_client'
  book_id?: string
  chapter_id?: string
  block_id?: string | null
  block_position?: number | null
  content_version?: number
  total_blocks?: number
  updated_at?: string
}

export interface BookReadingProgress {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  total_blocks: number
  content_version: number
  updated_at: string | null
}

const GET_CACHE_TTL_MS = 2000
const inflightGetRequests = new Map<string, Promise<unknown>>()
const recentGetResponses = new Map<string, { expiresAt: number; value: unknown }>()

// Reading position cache with TTL (30 seconds)
const POSITION_CACHE_TTL_MS = 30000
const positionCache = new Map<string, { data: ReadingPosition; expiresAt: number }>()

/** Clears the entire reading-position cache (used by useSyncCheck on cross-device sync) */
export function positionCacheInvalidateAll() {
  positionCache.clear()
}


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
  return request<ApiBook[]>(`/api/books${params}`).then((books) => {
    for (const b of books) {
      bookByIdCache.set(b.id, b)
      // Best-effort: persist for fast reloads. Authenticated flows overwrite scoped caches when userId is known.
      void setCachedBookMeta('guest', b)
    }
    return books
  })
}

export function fetchBook(id: string): Promise<ApiBook> {
  // Some backend deployments expose only GET /api/books (without /api/books/:id).
  // Resolve book from list to avoid noisy 404 in reader startup.
  return request<ApiBook[]>('/api/books').then((allBooks) => {
    const book = allBooks.find((item) => item.id === id)
    if (!book) throw new Error('Book not found')
    bookByIdCache.set(book.id, book)
    void setCachedBookMeta('guest', book)
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

export function translateChapterTitles(
  bookId: string,
  lang: string,
): Promise<{ results: { id: string; title: string }[] }> {
  return request<{ results: { id: string; title: string }[] }>(
    `/api/books/${bookId}/chapters/translate-titles`,
    { method: 'POST', body: JSON.stringify({ lang: lang.toUpperCase() }) },
  )
}

export function fetchContent(chapterId: string, lang?: string, signal?: AbortSignal): Promise<ContentBlock[]> {
  const params = lang ? `?lang=${encodeURIComponent(lang.toUpperCase())}` : ''
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/content${params}`, { signal }).then((blocks) =>
    blocks.map(normalizeContentBlock),
  )
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
 * Calls onDone when translation is complete with summary metrics.
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
  onDone?: (event: TranslateDoneEvent) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chapters/${chapterId}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds, anchorBlockId, direction }),
    signal,
  })

  if (!res.ok) {
    const errBody = await res.json().catch((): unknown => ({}))
    const message =
      typeof errBody === 'object' &&
      errBody !== null &&
      'message' in errBody &&
      typeof errBody.message === 'string'
        ? errBody.message
        : `Request failed: ${res.status}`
    throw new Error(message)
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
            const message = JSON.parse(trimmed) as TranslateStreamMessage
            if ('event' in message && message.event === 'translate_done') {
              // This is the final summary event
              if (onDone) onDone(message)
            } else {
              // This is a block translation result
              onBlock(message as TranslatedBlockResult)
            }
          } catch {
            // skip malformed lines
          }
        }
      }
      // Handle any remaining buffered content
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer.trim()) as TranslateStreamMessage
          if ('event' in message && message.event === 'translate_done') {
            if (onDone) onDone(message)
          } else {
            onBlock(message as TranslatedBlockResult)
          }
        } catch { /* ignore */ }
      }
    } finally {
      reader.releaseLock()
    }
  } else {
    // Fallback: plain JSON array (older server version)
    const data = await res.json() as ContentBlock[]
    for (const block of data) {
      let translatedText = ''
      if ('text' in block && typeof block.text === 'string') translatedText = block.text
      else if ('items' in block && Array.isArray(block.items)) translatedText = block.items.join('\n')
      onBlock({ blockId: block.id, status: 'ok', cache: 'miss', translatedText })
    }
  }
}

export function fetchBlockTexts(chapterId: string, lang: string, blockIds: string[]): Promise<FetchBlockTextsResponse> {
  return request<FetchBlockTextsResponse>(`/api/chapters/${chapterId}/blocks/text`, {
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

export function fetchReadingPosition(bookId: string): Promise<ReadingPosition> {
  // Check cache first
  const cached = positionCache.get(bookId)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data)
  }

  return request<ReadingPosition>(`/api/books/${bookId}/reading-position`)
    .then((data) => {
      positionCache.set(bookId, {
        data,
        expiresAt: Date.now() + POSITION_CACHE_TTL_MS,
      })
      return data
    })
}

export function saveReadingPosition(
  bookId: string,
  data: SaveReadingPositionRequest
): Promise<SaveReadingPositionResponse> {
  // Invalidate position cache so next fetchReadingPosition gets fresh data
  positionCache.delete(bookId)
  return request<SaveReadingPositionResponse>(`/api/books/${bookId}/reading-position`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((response) => {
    // Update cache with the returned position so the next GET is already fresh
    if (response.persisted && response.chapter_id) {
      positionCache.set(bookId, {
        data: {
          book_id: bookId,
          chapter_id: response.chapter_id,
          block_id: response.block_id ?? null,
          block_position: response.block_position ?? null,
          lang: data.lang ?? null,
          updated_at: response.updated_at ?? null,
        },
        expiresAt: Date.now() + POSITION_CACHE_TTL_MS,
      })
    }
    // stale_client: server rejected our write because it has a newer position.
    // Cache is already invalidated (deleted before the PUT). The next
    // fetchReadingPosition will do a real GET and get the authoritative position.
    return response
  })
}

export interface SyncStatusResponse {
  account_version: string | null
  scopes: {
    library: string | null
    progress: string | null
    settings: string | null
  }
}

export function fetchSyncStatus(): Promise<SyncStatusResponse> {
  return request<SyncStatusResponse>('/api/sync/status')
}

export type UploadBookResponse =
  | { jobId: string; bookId: string }
  | (ApiBook & { chapter_count?: number })
  | { id: string; chapter_count?: number }

export interface SignedUrlResponse {
  signedUrl: string
  token: string
  path: string
}

export interface ProcessBookResponse {
  id: string
  chapter_count?: number
}

/** Get a signed URL for direct upload to Supabase Storage */
export function getSignedUploadUrl(bucket: string, path: string): Promise<SignedUrlResponse> {
  return request<SignedUrlResponse>('/api/storage/signed-url', {
    method: 'POST',
    body: JSON.stringify({ bucket, path }),
  })
}

/** Upload file directly to Supabase Storage using signed URL */
export async function uploadToStorage(signedUrl: string, file: File, contentType: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Storage upload failed: ${errorText}`)
  }
}

/** Process an already-uploaded EPUB file */
export function processBook(filePath: string, fileName: string, fileSize: number): Promise<ProcessBookResponse> {
  return request<ProcessBookResponse>('/api/books/process', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath, file_name: fileName, file_size: fileSize }),
  })
}

/** @deprecated Use getSignedUploadUrl + uploadToStorage + processBook instead */
export function uploadBook(formData: FormData): Promise<UploadBookResponse> {
  return request<UploadBookResponse>('/api/books/upload', {
    method: 'POST',
    body: formData,
  })
}

export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

export interface JobStatus {
  state: JobState
  progress: number
  result?: { bookId: string; title: string; author: string | null; chapterCount: number }
  failReason?: string
}

export function getJobStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/jobs/${jobId}`)
}
