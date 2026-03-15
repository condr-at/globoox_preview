import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default async function RootPage() {
  // Check if user is authenticated
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Authenticated users go to library
    if (session) {
      redirect('/library');
    }
  } catch (error) {
    // If auth check fails, redirect to landing anyway
    console.error('Auth check error:', error);
  }

  // Unauthenticated users go to landing
  redirect('/landing');
}
