import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Forward request to real backend API when NEXT_PUBLIC_API_URL is configured.
 * Attaches Supabase auth token when user is logged in.
 * Returns null only when no backend URL is configured.
 */
export async function proxyToBackend(request: Request): Promise<NextResponse | null> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL
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
    { error: 'Backend API is not configured. Set NEXT_PUBLIC_API_URL.' },
    { status: 503 }
  )
}
