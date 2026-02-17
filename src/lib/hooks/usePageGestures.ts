'use client'

import { useCallback, useRef } from 'react'

interface UsePageGesturesOptions {
  onPrev: () => void
  onNext: () => void
  /** Disable all gesture handling (e.g. when overlays are open) */
  enabled?: boolean
}

interface TouchPoint { x: number; y: number }

// px of horizontal drag required to trigger a page turn
const SWIPE_THRESHOLD = 60
// px of movement below which touch counts as a tap (not drag)
const TAP_THRESHOLD = 12
// fraction of screen width for edge-tap zones (left & right)
const EDGE_TAP_ZONE = 0.20
// fraction of screen width: safe zone for drag starts
const DRAG_SAFE_MIN = 0.15
const DRAG_SAFE_MAX = 0.85
// px from the very left edge reserved for the iOS system back gesture
const IOS_SYSTEM_EDGE = 20

export function usePageGestures({ onPrev, onNext, enabled = true }: UsePageGesturesOptions) {
  const touchStart = useRef<TouchPoint | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStart.current) return

    const t = e.changedTouches[0]
    const start = touchStart.current
    touchStart.current = null

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const screenW = window.innerWidth

    // Primarily vertical movement → let the system handle it (scroll, rubber-band, etc.)
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return

    const isTap = Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD

    if (isTap) {
      // Left-edge tap → previous page (avoid the iOS system back gesture strip)
      if (t.clientX > IOS_SYSTEM_EDGE && t.clientX < screenW * EDGE_TAP_ZONE) {
        onPrev()
      // Right-edge tap → next page
      } else if (t.clientX > screenW * (1 - EDGE_TAP_ZONE)) {
        onNext()
      }
      return
    }

    // Drag / swipe — only accept if the gesture started in the central safe zone
    // and not within the iOS system-back-gesture strip
    const inSafeZone =
      start.x > screenW * DRAG_SAFE_MIN &&
      start.x < screenW * DRAG_SAFE_MAX &&
      start.x > IOS_SYSTEM_EDGE

    if (inSafeZone && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) onPrev()   // swipe right → previous
      else onNext()           // swipe left  → next
    }
  }, [enabled, onPrev, onNext])

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}
