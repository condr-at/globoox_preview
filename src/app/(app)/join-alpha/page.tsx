'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/useAuth';
import { joinAlpha } from '@/lib/api';

interface JoinAlphaPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function JoinAlphaPage({ searchParams }: JoinAlphaPageProps) {
  const { token } = use(searchParams);
  const router = useRouter();
  const { user, isAlpha, loading: authLoading, refreshAlphaStatus } = useAuth();
  const [status, setStatus] = useState<'idle' | 'joining' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleJoin = async () => {
    if (!token) return;
    setStatus('joining');
    try {
      await joinAlpha(token);
      refreshAlphaStatus();
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid or expired token');
      setStatus('error');
    }
  };

  // If user is already alpha, show success immediately
  useEffect(() => {
    if (!authLoading && isAlpha) setStatus('success');
  }, [authLoading, isAlpha]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    const returnUrl = token ? `/join-alpha?token=${encodeURIComponent(token)}` : '/join-alpha';
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <FlaskConical className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Join Alpha Program</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to activate your alpha access.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href={`/auth?redirect=${encodeURIComponent(returnUrl)}`}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h1 className="text-lg font-semibold">Invalid Link</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This link is missing a token. Please use the link provided by our team.
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/my-books">Go to My Books</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
          {status === 'success' ? (
            <>
              <CheckCircle className="w-14 h-14 text-green-500" />
              <div>
                <h1 className="text-lg font-semibold">You&apos;re an Alpha Tester!</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlimited translation access is now active on your account.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/my-books">Go to My Books</Link>
              </Button>
            </>
          ) : status === 'error' ? (
            <>
              <XCircle className="w-14 h-14 text-destructive" />
              <div>
                <h1 className="text-lg font-semibold">Access Denied</h1>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/my-books">Go to My Books</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <FlaskConical className="w-7 h-7 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Join Alpha Program</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Activate unlimited translation access for your account.
                </p>
              </div>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleJoin}
                disabled={status === 'joining'}
              >
                {status === 'joining' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {status === 'joining' ? 'Activating…' : 'Activate Alpha Access'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
