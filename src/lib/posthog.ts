import posthog from 'posthog-js'

// ─── Generic API tracking ─────────────────────────────────────────────────────

export function trackApiRequest(
  endpoint: string,
  method: string,
  durationMs: number,
  success: boolean,
  statusCode?: number
) {
  posthog.capture('api_request', { endpoint, method, duration_ms: durationMs, success, status_code: statusCode })
}

// ─── User Identity ─────────────────────────────────────────────────────────────

export function identifyUser(userId: string, email?: string) {
  posthog.identify(userId, email ? { email } : undefined)
}

export function resetUser() {
  posthog.reset()
}

// PostHog automatically captures UTM parameters — no manual capture needed.
// Kept as a no-op so call sites don't need changes.
export function captureFirstVisitUtm() {}

// ─── User Acquisition & Auth ──────────────────────────────────────────────────

export function trackUserSignedUp(method: 'email' | 'google') {
  posthog.capture('user_signed_up', { method })
}

export function trackUserLoggedIn(method: 'email' | 'google') {
  posthog.capture('user_logged_in', { method })
}

// ─── Book Lifecycle ────────────────────────────────────────────────────────────

export function trackBookUploadStarted(props: { file_size_kb: number }) {
  posthog.capture('book_upload_started', props)
}

export function trackBookUploaded(props: {
  title: string
  author: string
  language: string
  chapter_count: number
  file_size_kb: number
}) {
  posthog.capture('book_uploaded', props)
}

export function trackBookUploadFailed(props: { error: string; file_size_kb: number }) {
  posthog.capture('book_upload_failed', props)
}

export function trackBookOpened(props: {
  book_id: string
  title: string
  source: 'library' | 'store'
}) {
  posthog.capture('book_opened', props)
}

// ─── Reading Session ───────────────────────────────────────────────────────────

export function trackReadingSessionStarted(props: {
  book_id: string
  chapter_index: number
  language: string
}) {
  posthog.capture('reading_session_started', props)
}

export function trackReadingSessionEnded(props: {
  book_id: string
  duration_seconds: number
  pages_read: number
  chapters_navigated: number
}) {
  posthog.capture('reading_session_ended', props)
}

export function trackChapterCompleted(props: {
  book_id: string
  chapter_index: number
  total_chapters: number
}) {
  posthog.capture('chapter_completed', props)
}

export function trackBookFinished(props: { book_id: string; total_chapters: number }) {
  posthog.capture('book_finished', props)
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
  posthog.capture('translation_batch_sent', props)
}

export function trackLanguageSwitched(props: {
  book_id: string
  from_language: string
  to_language: string
}) {
  posthog.capture('language_switched', props)
}

// ─── Reader Settings ───────────────────────────────────────────────────────────

export function trackFontSizeChanged(props: {
  font_size: number
  previous_font_size: number
}) {
  posthog.capture('font_size_changed', props)
}
