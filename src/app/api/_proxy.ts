import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Forwards the incoming request to NEXT_PUBLIC_API_URL (real backend) with Supabase auth.
 * Returns null if NEXT_PUBLIC_API_URL is not set — caller falls back to mock data.
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
    return NextResponse.json(data ?? {}, { status: res.status })
  } catch {
    // Backend unreachable — let the caller fall back to mock
    return null
  }
}
