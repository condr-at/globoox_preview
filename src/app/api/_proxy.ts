import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Logged-in users: forward request to real backend with Supabase auth.
 * Logged-out users: return null so caller falls back to mock data.
 */
export async function proxyToBackend(request: Request): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Guest mode: caller should serve mock data.
  if (!session?.access_token) return null

  const backendUrl = process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl) {
    return NextResponse.json(
      { error: 'Backend URL is not configured' },
      { status: 500 }
    )
  }

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
    response.headers.set('x-authenticated', 'true')
    return response
  } catch {
    // Logged-in users should use backend only.
    return NextResponse.json(
      { error: 'Backend is unavailable' },
      { status: 502 }
    )
  }
}
