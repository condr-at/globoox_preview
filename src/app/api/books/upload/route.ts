import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../_proxy'

// App Router uses runtime config, not Pages Router config
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  return requireBackendProxy(request)
}
