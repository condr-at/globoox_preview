import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return requireBackendProxy(request)
}
