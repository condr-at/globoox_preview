import { NextResponse } from 'next/server'
import { proxyToBackend } from '@/app/api/_proxy'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const proxied = await proxyToBackend(request)
  if (proxied) return proxied

  // Mock mode: acknowledge without persisting
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ id, selected_language: body.selected_language ?? null })
}
