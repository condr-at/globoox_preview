// Always routes through local Next.js API routes.
// To connect to a real backend, set NEXT_PUBLIC_API_URL in .env — the API routes will proxy automatically.
const API_URL = ''

export interface ApiBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null
  available_languages: string[]
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export function fetchBooks(status?: string): Promise<ApiBook[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<ApiBook[]>(`/api/books${params}`)
}

export function fetchBook(id: string): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${id}`)
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
