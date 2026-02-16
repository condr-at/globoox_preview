import { NextResponse } from 'next/server'
import { proxyToBackend } from '../../_proxy'
import booksData from '@/data/mock-api/books.json'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { id } = await params
  const book = booksData.find((b) => b.id === id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(book)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { id } = await params
  const book = booksData.find((b) => b.id === id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json()
  return NextResponse.json({ ...book, ...body })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { id } = await params
  const exists = booksData.some((b) => b.id === id)
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
