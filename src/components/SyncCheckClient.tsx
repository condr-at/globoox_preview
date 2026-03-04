'use client'

import { useSyncCheck } from '@/lib/hooks/useSyncCheck'

export default function SyncCheckClient() {
  useSyncCheck()
  return null
}

