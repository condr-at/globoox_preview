'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { identifyUser, resetUser, trackUserSignedUp } from '@/lib/posthog';

const SIGNUP_TRACKED_KEY = 'posthog_signup_tracked';
const UTM_STORAGE_KEY = 'globooks_utm';

function getSavedUtmParams(): Record<string, string> | undefined {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** Detect new sign-up: created_at within last 60 seconds */
function isNewUser(user: { created_at?: string }): boolean {
  if (!user.created_at) return false;
  const created = new Date(user.created_at).getTime();
  return Date.now() - created < 60_000;
}

/** Mark sign-up as tracked so we don't fire twice across re-renders / page loads */
function markSignUpTracked(userId: string) {
  try { sessionStorage.setItem(SIGNUP_TRACKED_KEY, userId); } catch {}
}

function wasSignUpTracked(userId: string): boolean {
  try { return sessionStorage.getItem(SIGNUP_TRACKED_KEY) === userId; } catch { return false; }
}

/**
 * Mounts once in the root layout.
 * Syncs Supabase auth state → PostHog identity so that
 * "unique users" in PostHog correspond to real accounts.
 * Also reliably tracks `user_signed_up` for both email and OAuth flows.
 */
export default function PostHogProvider() {
  const trackedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function handleUser(user: { id: string; email?: string; created_at?: string; app_metadata?: { provider?: string } }) {
      identifyUser(user.id, user.email ?? undefined);

      // Track sign-up once for genuinely new users
      if (!trackedRef.current && !wasSignUpTracked(user.id) && isNewUser(user)) {
        trackedRef.current = true;
        markSignUpTracked(user.id);
        const method = user.app_metadata?.provider === 'google' ? 'google' : 'email';
        trackUserSignedUp(method, getSavedUtmParams());
      }
    }

    // Identify already-logged-in user on page load / hard refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUser(session.user);
      }
    });

    // Keep PostHog in sync as auth state changes during the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        resetUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
