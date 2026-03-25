import { requireBackendProxy } from '@/app/(app)/api/_proxy'

export async function POST(request: Request) {
  return requireBackendProxy(request)
}
