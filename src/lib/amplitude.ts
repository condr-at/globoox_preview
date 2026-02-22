declare global {
  interface Window {
    amplitude?: {
      track: (eventName: string, eventProperties?: Record<string, unknown>) => void
      init: (apiKey: string, options?: Record<string, unknown>) => void
      add: (plugin: unknown) => void
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
