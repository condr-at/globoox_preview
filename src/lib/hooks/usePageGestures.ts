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
export interface TapZones {
  leftEdge: number
  rightEdge: number
  iosEdge: number
  leftZoneEnd: number
  rightZoneStart: number
  centerStart: number
  centerEnd: number
}

// px of horizontal drag required to trigger a page turn
const SWIPE_THRESHOLD = 60
// px of movement below which touch counts as a tap (not drag)
const TAP_THRESHOLD = 12
const TAP_ZONE_MIN_PX = 72
const TAP_ZONE_TARGET_VIEWPORT_RATIO = 0.20
const TAP_ZONE_MAX_PX = 160
const TAP_ZONE_OVERLAP_PX = 16
const CONTENT_MAX_WIDTH_PX = 672
const PAGE_TEXT_SIDE_PADDING_PX = 16
const SPREAD_GAP_PX = 120
const SPREAD_SIDE_PADDING_PX = 40
const SPREAD_MAX_COLUMN_PX = 560
// small safe margin from the very edges (px) — avoids iOS system gestures
const EDGE_SAFE_PX = 12
// fraction of screen width used for drag-safe edge gutters
const DRAG_SAFE_EDGE_FRACTION = 0.08
// px from the very left edge reserved for the iOS system back gesture
const IOS_SYSTEM_EDGE = 20
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function getTapZones(rect: DOMRect, spreadModeEnabled: boolean): TapZones {
  const leftEdge = rect.left + EDGE_SAFE_PX
  const rightEdge = rect.right - EDGE_SAFE_PX
  const iosEdge = rect.left + IOS_SYSTEM_EDGE

  const defaultSideZoneWidth = clamp(
    rect.width * TAP_ZONE_TARGET_VIEWPORT_RATIO,
    TAP_ZONE_MIN_PX,
    TAP_ZONE_MAX_PX,
  )
  const textInset = spreadModeEnabled
    ? Math.max((rect.width - ((SPREAD_MAX_COLUMN_PX * 2) + SPREAD_GAP_PX + (SPREAD_SIDE_PADDING_PX * 2))) / 2, 0) + SPREAD_SIDE_PADDING_PX
    : Math.max((rect.width - Math.min(rect.width, CONTENT_MAX_WIDTH_PX)) / 2, 0) + PAGE_TEXT_SIDE_PADDING_PX
  const sideZoneWidth = Math.max(defaultSideZoneWidth, (textInset / 2) + TAP_ZONE_OVERLAP_PX)
  const leftZoneEnd = rect.left + sideZoneWidth
  const rightZoneStart = rect.right - sideZoneWidth
  return {
    leftEdge,
    rightEdge,
    iosEdge,
    leftZoneEnd,
    rightZoneStart,
    centerStart: leftZoneEnd,
    centerEnd: rightZoneStart,
  }
}

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
    const zones = getTapZones(rect, spreadModeEnabled)
    if (x <= zones.leftEdge || x >= zones.rightEdge) return

    if (x > zones.iosEdge && x < zones.leftZoneEnd) {
      onPrev()
    } else if (x > zones.rightZoneStart) {
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
    const safeEdgeInset = Math.max(rect.width * DRAG_SAFE_EDGE_FRACTION, IOS_SYSTEM_EDGE)
    const inSafeZone =
      start.x > rect.left + safeEdgeInset &&
      start.x < rect.right - safeEdgeInset

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
