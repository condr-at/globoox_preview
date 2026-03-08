'use client'

import { useEffect, useState } from 'react'
import { positionCacheInvalidateAll } from '@/lib/api'
import { clearEntireContentCache } from '@/lib/contentCache'
import { useSyncCheck } from '@/lib/hooks/useSyncCheck'

const CACHE_EPOCH_STORAGE_KEY = 'globoox-preview-cache-epoch'
const CACHE_EPOCH = '2026-03-09-1'

function SyncCheckBootstrap() {
  useSyncCheck()
  return null
}

export default function SyncCheckClient() {
  const [cacheEpochReady, setCacheEpochReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (typeof window === 'undefined') {
        if (!cancelled) setCacheEpochReady(true)
        return
      }

      const savedEpoch = window.localStorage.getItem(CACHE_EPOCH_STORAGE_KEY)
      if (savedEpoch === CACHE_EPOCH) {
        if (!cancelled) setCacheEpochReady(true)
        return
      }

      try {
        positionCacheInvalidateAll()
        await clearEntireContentCache()
      } catch (error) {
        console.warn('[cache-epoch] failed to clear IndexedDB:', error)
      } finally {
        window.localStorage.setItem(CACHE_EPOCH_STORAGE_KEY, CACHE_EPOCH)
      }

      if (cancelled) return

      setCacheEpochReady(true)
      window.location.reload()
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  if (!cacheEpochReady) return null
  return <SyncCheckBootstrap />
}
