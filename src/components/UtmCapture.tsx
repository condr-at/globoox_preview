'use client';

import { useEffect } from 'react';

const UTM_STORAGE_KEY = 'globooks_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Captures UTM params from the URL into sessionStorage on first visit.
 * Mounted in the root layout so it works on landing pages outside the (app) group.
 * Does NOT overwrite if UTMs were already saved (first-touch attribution).
 */
export default function UtmCapture() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(UTM_STORAGE_KEY)) return; // already captured
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const key of UTM_KEYS) {
        const val = params.get(key);
        if (val) utm[key] = val;
      }
      if (Object.keys(utm).length > 0) {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
      }
    } catch {}
  }, []);

  return null;
}
