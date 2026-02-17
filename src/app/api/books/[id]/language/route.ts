import { requireBackendProxy } from '@/app/api/_proxy'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void params
  return requireBackendProxy(request)
}
