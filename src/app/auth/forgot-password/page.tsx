'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/supabase/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

type RecoveryStatus = 'idle' | 'error' | 'success';

export default function ForgotPasswordPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RecoveryStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setError(null);

    const supabase = getSupabase();
    const siteUrl = getSiteUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    });

    if (error) {
      setStatus('error');
      setError('Account not found. Please check your email and try again.');
      setLoading(false);
      return;
    }

    setStatus('success');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-md backdrop-blur-sm">
          <CardHeader className="space-y-1.5 p-6">
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <CardDescription>Enter your account email and we&apos;ll send a reset link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            {status === 'error' && error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {status === 'success' && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500">
                Recovery email sent. Check your inbox.
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
              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Send reset link'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{' '}
              <Link href="/auth" className="text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary underline-offset-4 hover:underline">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
