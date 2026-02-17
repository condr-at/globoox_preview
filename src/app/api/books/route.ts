import { requireBackendProxy } from '../_proxy'

export async function GET(request: Request) {
  return requireBackendProxy(request)
}

export async function POST(request: Request) {
  return requireBackendProxy(request)
}
