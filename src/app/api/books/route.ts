import { NextResponse } from 'next/server'
import { proxyToBackend } from '../_proxy'
import booksData from '@/data/mock-api/books.json'
import type { ApiBook } from '@/lib/api'

export async function GET(request: Request) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const allBooks = booksData as ApiBook[]

  const books = status
    ? allBooks.filter((b) => b.status === status)
    : allBooks

  const response = NextResponse.json(books)
  response.headers.set('x-data-source', 'mock')
  response.headers.set('x-authenticated', 'false')
  return response
}

export async function POST(request: Request) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const body = await request.json()
  const newBook = {
    id: crypto.randomUUID(),
    title: body.title,
    author: body.author ?? null,
    cover_url: body.cover_url ?? null,
    original_language: body.source_language?.toUpperCase() ?? 'EN',
    available_languages: [body.source_language?.toUpperCase() ?? 'EN'],
    status: 'active',
    created_at: new Date().toISOString(),
  }
  return NextResponse.json(newBook, { status: 201 })
}
