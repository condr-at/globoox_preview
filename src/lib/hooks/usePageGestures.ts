'use client'

import { useCallback, useRef } from 'react'

interface UsePageGesturesOptions {
  onPrev: () => void
  onNext: () => void
  onToggleChrome: () => void
  /** Disable all gesture handling (e.g. when overlays are open) */
  enabled?: boolean
}

interface TouchPoint { x: number; y: number }

// px of horizontal drag required to trigger a page turn
const SWIPE_THRESHOLD = 60
// px of movement below which touch counts as a tap (not drag)
const TAP_THRESHOLD = 12
// 30/40/30 zone fractions
const LEFT_ZONE = 0.30
const RIGHT_ZONE = 0.70
// small safe margin from the very edges (px) — avoids iOS system gestures
const EDGE_SAFE_PX = 12
// fraction of screen width: safe zone for drag starts
const DRAG_SAFE_MIN = 0.15
const DRAG_SAFE_MAX = 0.85
// px from the very left edge reserved for the iOS system back gesture
const IOS_SYSTEM_EDGE = 20

export function usePageGestures({ onPrev, onNext, onToggleChrome, enabled = true }: UsePageGesturesOptions) {
  const touchStart = useRef<TouchPoint | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    // Prevent browser from doing anything with this touch (kills bounce/rubber-band)
    e.preventDefault()
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [enabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    // Kill rubber-band / overscroll on every move
    e.preventDefault()
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStart.current) return
    e.preventDefault()

    const t = e.changedTouches[0]
    const start = touchStart.current
    touchStart.current = null

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const screenW = window.innerWidth

    // Primarily vertical movement → ignore
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return

    const isTap = Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD

    if (isTap) {
      const x = t.clientX

      // Left zone (30%): prev page — skip iOS system back-gesture strip
      if (x > IOS_SYSTEM_EDGE && x > EDGE_SAFE_PX && x < screenW * LEFT_ZONE) {
        onPrev()
      // Right zone (30%): next page
      } else if (x > screenW * RIGHT_ZONE && x < screenW - EDGE_SAFE_PX) {
        onNext()
      // Center zone (40%): toggle chrome
      } else if (x >= screenW * LEFT_ZONE && x <= screenW * RIGHT_ZONE) {
        onToggleChrome()
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
  }, [enabled, onPrev, onNext, onToggleChrome])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }
}
