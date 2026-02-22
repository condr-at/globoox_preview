'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { identifyUser, resetUser, captureFirstVisitUtm } from '@/lib/amplitude';

/**
 * Mounts once in the root layout.
 * - Captures first-visit UTM params as permanent user properties.
 * - Syncs Supabase auth state → Amplitude user ID so that
 *   "unique users" in Amplitude correspond to real accounts,
 *   not anonymous device IDs.
 */
export default function AmplitudeProvider() {
  useEffect(() => {
    // UTM capture runs before auth resolves so anonymous pre-login
    // events are already tagged with the acquisition channel.
    captureFirstVisitUtm();

    const supabase = createClient();

    // Identify already-logged-in user on page load / hard refresh
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        identifyUser(session.user.id, session.user.email ?? undefined);
      }
    });

    // Keep Amplitude in sync as auth state changes during the session
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
