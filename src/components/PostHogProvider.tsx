'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { identifyUser, resetUser } from '@/lib/posthog';

/**
 * Mounts once in the root layout.
 * Syncs Supabase auth state → PostHog identity so that
 * "unique users" in PostHog correspond to real accounts.
 */
export default function PostHogProvider() {
  useEffect(() => {
    const supabase = createClient();

    // Identify already-logged-in user on page load / hard refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        identifyUser(session.user.id, session.user.email ?? undefined);
      }
    });

    // Keep PostHog in sync as auth state changes during the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        identifyUser(session.user.id, session.user.email ?? undefined);
      } else if (event === 'SIGNED_OUT') {
        resetUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
