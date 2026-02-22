interface AmplitudeIdentify {
  set: (key: string, value: string | number | boolean) => AmplitudeIdentify
  setOnce: (key: string, value: string | number | boolean) => AmplitudeIdentify
  add: (key: string, value: number) => AmplitudeIdentify
  unset: (key: string) => AmplitudeIdentify
}

declare global {
  interface Window {
    amplitude?: {
      track: (eventName: string, eventProperties?: Record<string, unknown>) => void
      init: (apiKey: string, options?: Record<string, unknown>) => void
      add: (plugin: unknown) => void
      setUserId: (userId: string | null) => void
      reset: () => void
      identify: (identifyObj: AmplitudeIdentify) => void
      Identify: new () => AmplitudeIdentify
    }
  }
}

export function trackApiRequest(
  endpoint: string,
  method: string,
  durationMs: number,
  success: boolean,
  statusCode?: number
) {
  if (typeof window !== 'undefined' && window.amplitude) {
    window.amplitude.track('api_request', {
      endpoint,
      method,
      duration_ms: durationMs,
      success,
      status_code: statusCode,
    })
  }
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.amplitude) {
    window.amplitude.track(eventName, properties)
  }
}

// ─── User Identity ─────────────────────────────────────────────────────────────

/**
 * Call after login / on session restore.
 * Links all future events to the authenticated user ID in Amplitude,
 * merging with any prior anonymous events from the same device.
 */
export function identifyUser(userId: string, email?: string) {
  if (typeof window === 'undefined' || !window.amplitude) return
  window.amplitude.setUserId(userId)
  if (email && window.amplitude.Identify) {
    const ev = new window.amplitude.Identify()
    ev.set('email', email)
    window.amplitude.identify(ev)
  }
}

/**
 * Call on logout. Resets user ID and device ID so post-logout
 * activity is not attributed to the previous user.
 */
export function resetUser() {
  if (typeof window === 'undefined' || !window.amplitude) return
  window.amplitude.reset()
}

// ─── First-Visit UTM Capture ───────────────────────────────────────────────────

const FIRST_UTM_KEY = 'globoox_first_utm'
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/**
 * Reads UTM params from the current URL on the very first visit and stores
 * them as permanent Amplitude user properties (`first_utm_*`).
 * Uses localStorage so the capture happens only once per browser,
 * regardless of how many times the user visits.
 * Call this on app mount before any auth state is resolved.
 */
export function captureFirstVisitUtm() {
  if (typeof window === 'undefined' || !window.amplitude) return
  if (localStorage.getItem(FIRST_UTM_KEY)) return   // Already captured

  const params = new URLSearchParams(window.location.search)
  const utms: Partial<Record<typeof UTM_PARAMS[number], string>> = {}
  for (const key of UTM_PARAMS) {
    const val = params.get(key)?.trim()
    if (val) utms[key] = val
  }

  // Always persist the first landing page, even without UTMs
  localStorage.setItem(FIRST_UTM_KEY, JSON.stringify({
    ...utms,
    landing_page: window.location.pathname,
    captured_at: new Date().toISOString(),
  }))

  if (!window.amplitude.Identify) return

  const ev = new window.amplitude.Identify()
  // setOnce means these are never overwritten on subsequent visits
  ev.setOnce('first_landing_page', window.location.pathname)
  if (utms.utm_source)   ev.setOnce('first_utm_source',   utms.utm_source)
  if (utms.utm_medium)   ev.setOnce('first_utm_medium',   utms.utm_medium)
  if (utms.utm_campaign) ev.setOnce('first_utm_campaign', utms.utm_campaign)
  if (utms.utm_content)  ev.setOnce('first_utm_content',  utms.utm_content)
  if (utms.utm_term)     ev.setOnce('first_utm_term',     utms.utm_term)
  window.amplitude.identify(ev)
}

// ─── User Acquisition & Auth ──────────────────────────────────────────────────

export function trackUserSignedUp(method: 'email' | 'google') {
  trackEvent('user_signed_up', { method })
}

export function trackUserLoggedIn(method: 'email' | 'google') {
  trackEvent('user_logged_in', { method })
}

// ─── Book Lifecycle ────────────────────────────────────────────────────────────

export function trackBookUploadStarted(props: { file_size_kb: number }) {
  trackEvent('book_upload_started', props)
}

export function trackBookUploaded(props: {
  title: string
  author: string
  language: string
  chapter_count: number
  file_size_kb: number
}) {
  trackEvent('book_uploaded', props)
}

export function trackBookUploadFailed(props: { error: string; file_size_kb: number }) {
  trackEvent('book_upload_failed', props)
}

export function trackBookOpened(props: {
  book_id: string
  title: string
  source: 'library' | 'store'
}) {
  trackEvent('book_opened', props)
}

// ─── Reading Session ───────────────────────────────────────────────────────────

export function trackReadingSessionStarted(props: {
  book_id: string
  chapter_index: number
  language: string
}) {
  trackEvent('reading_session_started', props)
}

export function trackReadingSessionEnded(props: {
  book_id: string
  duration_seconds: number
  pages_read: number
  chapters_navigated: number
}) {
  trackEvent('reading_session_ended', props)
}

export function trackChapterCompleted(props: {
  book_id: string
  chapter_index: number
  total_chapters: number
}) {
  trackEvent('chapter_completed', props)
}

export function trackBookFinished(props: { book_id: string; total_chapters: number }) {
  trackEvent('book_finished', props)
}

// ─── Translation ───────────────────────────────────────────────────────────────

export function trackTranslationBatch(props: {
  book_id: string
  chapter_id: string
  language: string
  block_count: number
  cache_hits: number
  cache_misses: number
  duration_ms: number
}) {
  trackEvent('translation_batch_sent', props)
}

export function trackLanguageSwitched(props: {
  book_id: string
  from_language: string
  to_language: string
}) {
  trackEvent('language_switched', props)
}

// ─── Reader Settings ───────────────────────────────────────────────────────────

export function trackFontSizeChanged(props: {
  font_size: number
  previous_font_size: number
}) {
  trackEvent('font_size_changed', props)
}
