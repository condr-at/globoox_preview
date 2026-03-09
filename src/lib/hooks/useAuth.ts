'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

let cachedUser: User | null | undefined = undefined; // undefined = unknown/not fetched yet
let cachedIsAdmin: boolean | undefined = undefined;
let cachedIsAlpha: boolean | undefined = undefined;
let cachedAdminUserId: string | undefined = undefined;
let cachedAdminFetchedAt: number | undefined = undefined;
const ADMIN_STALE_MS = 5 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser ?? null);
  const [isAdmin, setIsAdmin] = useState(cachedIsAdmin ?? false);
  const [isAlpha, setIsAlpha] = useState(cachedIsAlpha ?? false);
  const [loading, setLoading] = useState(cachedUser === undefined);
  const adminFetchInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      cachedUser = nextUser;
      setUser(nextUser);
      if (session?.user) {
        fetchProfileStatus(session.user.id);
      } else {
        cachedIsAdmin = false;
        cachedIsAlpha = false;
        setIsAdmin(false);
        setIsAlpha(false);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      cachedUser = nextUser;
      setUser(nextUser);
      if (session?.user) {
        fetchProfileStatus(session.user.id);
      } else {
        cachedIsAdmin = false;
        cachedIsAlpha = false;
        setIsAdmin(false);
        setIsAlpha(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileStatus = async (userId: string) => {
    const now = Date.now();
    if (
      cachedAdminUserId === userId &&
      cachedIsAdmin !== undefined &&
      cachedIsAlpha !== undefined &&
      cachedAdminFetchedAt !== undefined &&
      now - cachedAdminFetchedAt < ADMIN_STALE_MS
    ) {
      setIsAdmin(cachedIsAdmin);
      setIsAlpha(cachedIsAlpha);
      setLoading(false);
      return;
    }

    if (adminFetchInFlightRef.current) {
      await adminFetchInFlightRef.current;
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      adminFetchInFlightRef.current = Promise.resolve(
        supabase
          .from('profiles')
          .select('is_admin, is_alpha')
          .eq('id', userId)
          .single()
      )
        .then(({ data, error }) => {
          console.log('[useAuth] Fetched profile status:', { data, error, userId });

          if (error?.code === 'PGRST116') {
            // Profile doesn't exist, create it
            console.log('[useAuth] Profile not found, creating...');
            return supabase
              .from('profiles')
              .insert({ id: userId } as any)
              .then(() => {
                cachedAdminUserId = userId;
                cachedIsAdmin = false;
                cachedIsAlpha = false;
                cachedAdminFetchedAt = Date.now();
                setIsAdmin(false);
                setIsAlpha(false);
              });
          }

          if (!error && data) {
            const nextIsAdmin = data.is_admin || false;
            const nextIsAlpha = (data as any).is_alpha || false;
            cachedAdminUserId = userId;
            cachedIsAdmin = nextIsAdmin;
            cachedIsAlpha = nextIsAlpha;
            cachedAdminFetchedAt = Date.now();
            setIsAdmin(nextIsAdmin);
            setIsAlpha(nextIsAlpha);
            console.log('[useAuth] isAdmin:', nextIsAdmin, 'isAlpha:', nextIsAlpha);
          }
        })
        .finally(() => {
          adminFetchInFlightRef.current = null;
        });

      await adminFetchInFlightRef.current;
    } catch (e) {
      console.warn('Could not fetch profile status:', e);
      adminFetchInFlightRef.current = null;
    }

    setLoading(false);
  };

  const refreshAlphaStatus = () => {
    cachedAdminFetchedAt = undefined; // invalidate cache
    if (cachedUser) fetchProfileStatus(cachedUser.id);
  };

  return {
    user,
    isAdmin,
    isAlpha,
    loading,
    isAuthenticated: !!user,
    refreshAlphaStatus,
  };
}
