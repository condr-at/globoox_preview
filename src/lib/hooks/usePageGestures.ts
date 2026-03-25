'use client'

import { useCallback, useRef } from 'react'

interface UsePageGesturesOptions {
  onPrev: () => void
  onNext: () => void
  onToggleChrome: () => void
  /** Disable all gesture handling (e.g. when overlays are open) */
  enabled?: boolean
  /** Keep native scrolling enabled while still handling tap/swipe zones */
  preserveScroll?: boolean
  /** True when 2-page spread is actually active (not just enabled in settings) */
  spreadModeEnabled?: boolean
  /** Optional viewport rect getter (reader content viewport) */
  getViewportRect?: () => DOMRect | null
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
// Fixed center zone width for spread tap model: flex / center / flex
const SPREAD_CENTER_ZONE_PX = 1000

export function usePageGestures({
  onPrev,
  onNext,
  onToggleChrome,
  enabled = true,
  spreadModeEnabled = false,
  getViewportRect,
}: UsePageGesturesOptions) {
  const touchStart = useRef<TouchPoint | null>(null)
  const lastTouchAtRef = useRef(0)
  const getTapRect = useCallback((): DOMRect => {
    const rect = getViewportRect?.()
    if (rect) return rect
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }, [getViewportRect])
  const isInteractiveTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest('a, button, input, textarea, select, label, [role="button"], [data-no-page-click]')
    )
  }, [])

  const handleTapZoneAction = useCallback((x: number) => {
    const rect = getTapRect()
    const leftEdge = rect.left + EDGE_SAFE_PX
    const rightEdge = rect.right - EDGE_SAFE_PX
    const iosEdge = rect.left + IOS_SYSTEM_EDGE
    if (x <= leftEdge || x >= rightEdge) return

    if (spreadModeEnabled) {
      const centerWidth = Math.min(SPREAD_CENTER_ZONE_PX, rect.width)
      const centerStart = rect.left + (rect.width - centerWidth) / 2
      const centerEnd = centerStart + centerWidth
      if (x > iosEdge && x < centerStart) {
        onPrev()
      } else if (x > centerEnd) {
        onNext()
      } else {
        onToggleChrome()
      }
      return
    }

    const leftZoneEnd = rect.left + rect.width * LEFT_ZONE
    const rightZoneStart = rect.left + rect.width * RIGHT_ZONE
    if (x > iosEdge && x < leftZoneEnd) {
      onPrev()
    } else if (x > rightZoneStart) {
      onNext()
    } else {
      onToggleChrome()
    }
  }, [getTapRect, onNext, onPrev, onToggleChrome, spreadModeEnabled])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    lastTouchAtRef.current = Date.now()
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [enabled])

  const handleTouchMove = useCallback(() => {
    if (!enabled) return
  }, [enabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStart.current) return
    lastTouchAtRef.current = Date.now()

    const t = e.changedTouches[0]
    const start = touchStart.current
    touchStart.current = null

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const rect = getTapRect()

    // Primarily vertical movement → ignore
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return

    const isTap = Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD

    if (isTap) {
      handleTapZoneAction(t.clientX)
      return
    }

    // Drag / swipe — only accept if the gesture started in the central safe zone
    // and not within the iOS system-back-gesture strip
    const inSafeZone =
      start.x > rect.left + rect.width * DRAG_SAFE_MIN &&
      start.x < rect.left + rect.width * DRAG_SAFE_MAX &&
      start.x > rect.left + IOS_SYSTEM_EDGE

    if (inSafeZone && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) onPrev()   // swipe right → previous
      else onNext()           // swipe left  → next
    }
  }, [enabled, onPrev, onNext, handleTapZoneAction, getTapRect])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ignore synthetic click that can follow touchend on mobile.
    if (Date.now() - lastTouchAtRef.current < 450) return
    if (!enabled || isInteractiveTarget(e.target)) return
    handleTapZoneAction(e.clientX)
  }, [enabled, handleTapZoneAction, isInteractiveTarget])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick,
  }
}
