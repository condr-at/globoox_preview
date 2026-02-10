import Link from 'next/link';
import { BookOpen, Chrome } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function AuthPage() {
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
            “The fastest way to keep reading in any language.”
          </p>
        </aside>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-md backdrop-blur-sm">
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your email to continue to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <form className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input id="email" type="email" placeholder="name@example.com" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input id="password" type="password" placeholder="••••••••" required />
                </div>
                <Button type="submit" className="h-10 w-full">
                  Sign in
                </Button>
              </form>

              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button variant="outline" className="h-10 w-full">
                <Chrome className="size-4" />
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/library" className="text-primary underline-offset-4 hover:underline">
                  Start with library
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
