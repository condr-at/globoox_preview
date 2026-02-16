import { NextResponse } from 'next/server'
import { proxyToBackend } from '../../../_proxy'
import chaptersData from '@/data/mock-api/chapters.json'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const proxy = await proxyToBackend(request)
  if (proxy) return proxy

  const { id } = await params
  const chapters = (chaptersData as Record<string, unknown[]>)[id] ?? []
  return NextResponse.json(chapters)
}
