'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminStatus = async (userId: string) => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      console.log('[useAuth] Fetched admin status:', { data, error, userId });

      if (error?.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('[useAuth] Profile not found, creating...');
        await supabase
          .from('profiles')
          .insert({ id: userId } as any);
        setIsAdmin(false);
      } else if (!error && data) {
        setIsAdmin(data.is_admin || false);
        console.log('[useAuth] isAdmin set to:', data.is_admin);
      }
    } catch (e) {
      console.warn('Could not fetch admin status:', e);
    }
    
    setLoading(false);
  };

  return {
    user,
    isAdmin,
    loading,
    isAuthenticated: !!user,
  };
}
