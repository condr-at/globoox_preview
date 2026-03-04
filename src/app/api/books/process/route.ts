import { requireBackendProxy } from '@/app/api/_proxy'

export async function POST(request: Request) {
  return requireBackendProxy(request)
}
