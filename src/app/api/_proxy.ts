import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Forward request to real backend API when API_URL is configured.
 * Attaches Supabase auth token when user is logged in.
 * Returns null only when no backend URL is configured.
 */
export async function proxyToBackend(request: Request): Promise<NextResponse | null> {
  const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl) return null

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  // Derive the target URL from the incoming request path + query
  const { pathname, search } = new URL(request.url)
  const targetUrl = `${backendUrl}${pathname}${search}`

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined

  try {
    const res = await fetch(targetUrl, { method: request.method, headers, body })
    const contentType = res.headers.get('content-type') ?? ''

    // Pass NDJSON streaming responses through without buffering
    if (contentType.includes('ndjson') || contentType.includes('event-stream')) {
      const response = new NextResponse(res.body, { status: res.status })
      response.headers.set('Content-Type', contentType)
      response.headers.set('Cache-Control', 'no-cache')
      response.headers.set('X-Accel-Buffering', 'no')
      response.headers.set('x-data-source', 'backend')
      response.headers.set('x-authenticated', session ? 'true' : 'false')
      return response
    }

    const data = await res.json().catch(() => null)
    const response = NextResponse.json(data ?? {}, { status: res.status })
    response.headers.set('x-data-source', 'backend')
    response.headers.set('x-authenticated', session ? 'true' : 'false')
    return response
  } catch {
    return NextResponse.json(
      { error: 'Backend is unavailable' },
      { status: 502 }
    )
  }
}

export async function requireBackendProxy(request: Request): Promise<NextResponse> {
  const proxied = await proxyToBackend(request)
  if (proxied) return proxied

  return NextResponse.json(
    { error: 'Backend API is not configured. Set API_URL or NEXT_PUBLIC_API_URL environment variable.' },
    { status: 503 }
  )
}
