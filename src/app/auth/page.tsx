'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Chrome, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'Authentication failed. Please try again.' : null
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabase();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/library');
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setMessage('Check your email for a confirmation link.');
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl md:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-border/70 bg-[var(--bg-grouped)] p-12 md:flex md:flex-col md:justify-between">
          <div className="pointer-events-none absolute -left-24 top-[-120px] h-72 w-72 rounded-full bg-[var(--system-blue)]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-120px] right-[-60px] h-72 w-72 rounded-full bg-[var(--system-green)]/15 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="size-5" />
            </div>
            <span className="text-lg font-semibold">Globoox</span>
          </div>

          <div className="relative space-y-4">
            <h1 className="text-3xl font-semibold leading-tight">
              Read and translate books with one account.
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              Sync progress across devices, keep your library and continue from the same paragraph.
            </p>
          </div>

          <p className="relative text-sm text-muted-foreground">
            &quot;The fastest way to keep reading in any language.&quot;
          </p>
        </aside>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-md backdrop-blur-sm">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="text-2xl">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {mode === 'signin'
                  ? 'Enter your email to continue to your account'
                  : 'Enter your email to create a new account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : mode === 'signin' ? (
                    'Sign in'
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                className="h-10 w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Chrome className="size-4" />
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
                {' · '}
                <Link href="/library" className="text-primary underline-offset-4 hover:underline">
                  Browse as guest
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
