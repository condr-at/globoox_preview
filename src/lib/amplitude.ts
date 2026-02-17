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
