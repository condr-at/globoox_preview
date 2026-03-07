import { requireBackendProxy } from '../../../_proxy'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void params
  return requireBackendProxy(request)
}
